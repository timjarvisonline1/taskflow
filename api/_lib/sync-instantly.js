const { getServiceClient, getCredentials, updateSyncStatus, logSync } = require('./supabase');

const INSTANTLY_BASE = 'https://api.instantly.ai/api/v2';

async function syncInstantly(userId) {
  const cred = await getCredentials(userId, 'instantly');
  if (!cred) throw new Error('Instantly not connected');

  const apiKey = cred.credentials ? cred.credentials.api_key : null;
  if (!apiKey) throw new Error('Instantly API key missing');

  const headers = { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' };
  const stats = { fetched: 0, inserted: 0, updated: 0, skipped: 0, error: '' };
  const client = getServiceClient();

  try {
    // ═══════════ 1. SYNC CAMPAIGNS ═══════════
    const campaignMap = {}; // instantly_id → supabase uuid
    let campaignCursor = null;
    let campaignHasMore = true;

    while (campaignHasMore) {
      const params = ['limit=100'];
      if (campaignCursor) params.push('starting_after=' + encodeURIComponent(campaignCursor));
      const url = INSTANTLY_BASE + '/campaigns?' + params.join('&');

      const resp = await fetch(url, { headers });
      if (!resp.ok) throw new Error('Instantly campaigns API: ' + resp.status);
      const data = await resp.json();
      const items = data.items || data || [];
      stats.fetched += items.length;

      for (const c of items) {
        const instantlyId = c.id || c.campaign_id;
        if (!instantlyId) continue;

        const row = {
          user_id: userId,
          instantly_id: instantlyId,
          name: c.name || '',
          status: c.status || '',
          created_at_ext: c.timestamp || c.created_at || null,
          metadata: JSON.stringify(c.metadata || {}),
          synced_at: new Date().toISOString()
        };

        const { data: upserted, error } = await client
          .from('instantly_campaigns')
          .upsert(row, { onConflict: 'user_id,instantly_id' })
          .select('id')
          .single();

        if (error) { console.error('Campaign upsert error:', error.message); stats.skipped++; continue; }
        if (upserted) campaignMap[instantlyId] = upserted.id;
        stats.inserted++;
      }

      campaignCursor = data.next_starting_after || null;
      campaignHasMore = !!campaignCursor && items.length > 0;
    }

    // Build campaign lookup for existing campaigns we didn't just upsert
    const { data: allCampaigns } = await client
      .from('instantly_campaigns')
      .select('id, instantly_id')
      .eq('user_id', userId);
    if (allCampaigns) {
      allCampaigns.forEach(function(c) { campaignMap[c.instantly_id] = c.id; });
    }

    // ═══════════ 2. SYNC CAMPAIGN ANALYTICS ═══════════
    try {
      const analyticsResp = await fetch(INSTANTLY_BASE + '/campaigns/analytics', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ campaign_ids: Object.keys(campaignMap) })
      });
      if (analyticsResp.ok) {
        const analyticsData = await analyticsResp.json();
        // Analytics may come as array or keyed by campaign_id
        const entries = Array.isArray(analyticsData) ? analyticsData : (analyticsData.items || []);
        for (const a of entries) {
          const cId = a.campaign_id || a.id;
          const supaId = campaignMap[cId];
          if (!supaId) continue;

          const leadsCount = a.leads_count || a.total_leads || 0;
          const contactedCount = a.contacted_count || a.contacted || 0;
          const repliesCount = a.replies_count || a.replies || 0;
          const bouncedCount = a.bounced_count || a.bounced || 0;
          const total = contactedCount || leadsCount || 1;

          await client.from('instantly_campaigns').update({
            leads_count: leadsCount,
            contacted_count: contactedCount,
            replies_count: repliesCount,
            bounced_count: bouncedCount,
            open_rate: a.open_rate || (a.opens ? a.opens / total : 0),
            reply_rate: a.reply_rate || (repliesCount ? repliesCount / total : 0),
            synced_at: new Date().toISOString()
          }).eq('id', supaId);
        }
      }
    } catch (e) { console.error('Campaign analytics sync error:', e.message); }

    // ═══════════ 3. SYNC LEADS (per campaign) ═══════════
    for (const [instantlyCampaignId, supabaseCampaignId] of Object.entries(campaignMap)) {
      let leadCursor = null;
      let leadHasMore = true;

      while (leadHasMore) {
        const body = { campaign_id: instantlyCampaignId, limit: 100 };
        if (leadCursor) body.starting_after = leadCursor;

        const resp = await fetch(INSTANTLY_BASE + '/leads/list', {
          method: 'POST', headers: headers, body: JSON.stringify(body)
        });
        if (!resp.ok) { console.error('Leads list error for campaign ' + instantlyCampaignId + ': ' + resp.status); break; }
        const data = await resp.json();
        const items = data.items || data || [];
        stats.fetched += items.length;

        for (const lead of items) {
          const leadId = lead.id || lead.lead_id;
          if (!leadId) continue;

          const row = {
            user_id: userId,
            instantly_id: leadId,
            campaign_id: supabaseCampaignId,
            email: lead.email || '',
            first_name: lead.first_name || '',
            last_name: lead.last_name || '',
            company_name: lead.company_name || lead.company || '',
            phone: lead.phone || lead.phone_number || '',
            website: lead.website || '',
            title: lead.title || '',
            interest_status: lead.interest_status || lead.lead_interest_status || '',
            lead_status: lead.status || lead.lead_status || '',
            custom_variables: JSON.stringify(lead.custom_variables || lead.variables || {}),
            metadata: JSON.stringify({ campaign_instantly_id: instantlyCampaignId }),
            synced_at: new Date().toISOString()
          };

          const { error } = await client
            .from('instantly_leads')
            .upsert(row, { onConflict: 'user_id,instantly_id' });

          if (error) { stats.skipped++; } else { stats.inserted++; }
        }

        leadCursor = data.next_starting_after || null;
        leadHasMore = !!leadCursor && items.length > 0;
      }
    }

    // ═══════════ 4. SYNC EMAILS (replies + recent outbound) ═══════════
    // Build lead lookup: instantly_id → supabase uuid
    const leadMap = {};
    const { data: allLeads } = await client
      .from('instantly_leads')
      .select('id, instantly_id')
      .eq('user_id', userId);
    if (allLeads) {
      allLeads.forEach(function(l) { leadMap[l.instantly_id] = l.id; });
    }

    // Fetch emails per campaign
    for (const [instantlyCampaignId, supabaseCampaignId] of Object.entries(campaignMap)) {
      let emailCursor = null;
      let emailHasMore = true;

      while (emailHasMore) {
        const params = ['campaign_id=' + encodeURIComponent(instantlyCampaignId), 'limit=100'];
        if (emailCursor) params.push('starting_after=' + encodeURIComponent(emailCursor));
        const url = INSTANTLY_BASE + '/emails?' + params.join('&');

        const resp = await fetch(url, { headers });
        if (!resp.ok) { console.error('Emails list error for campaign ' + instantlyCampaignId + ': ' + resp.status); break; }
        const data = await resp.json();
        const items = data.items || data || [];
        stats.fetched += items.length;

        for (const email of items) {
          const emailId = email.id || email.email_id;
          if (!emailId) continue;

          // Determine if this is a reply (inbound) or outbound
          const isReply = email.is_reply === true || email.type === 'reply' || email.direction === 'inbound';
          const direction = isReply ? 'inbound' : 'outbound';

          // Try to link to a lead
          const leadInstantlyId = email.lead_id || email.lead || '';
          const supaLeadId = leadMap[leadInstantlyId] || null;

          const row = {
            user_id: userId,
            instantly_id: emailId,
            lead_id: supaLeadId,
            campaign_id: supabaseCampaignId,
            from_email: email.from_address || email.from_email || email.from || '',
            from_name: email.from_name || '',
            to_email: email.to_address || email.to_email || email.to || '',
            subject: email.subject || '',
            body: email.body || email.html_body || '',
            body_text: email.text_body || email.body_text || '',
            timestamp_ext: email.timestamp || email.sent_at || email.created_at || null,
            is_reply: isReply,
            direction: direction,
            metadata: JSON.stringify({
              campaign_instantly_id: instantlyCampaignId,
              thread_id: email.thread_id || '',
              message_id: email.message_id || ''
            }),
            synced_at: new Date().toISOString()
          };

          const { error } = await client
            .from('instantly_emails')
            .upsert(row, { onConflict: 'user_id,instantly_id' });

          if (error) { stats.skipped++; } else { stats.inserted++; }
        }

        emailCursor = data.next_starting_after || null;
        emailHasMore = !!emailCursor && items.length > 0;
      }
    }

    // ═══════════ 5. SYNC ACCOUNTS (sending accounts) ═══════════
    let acctCursor = null;
    let acctHasMore = true;

    while (acctHasMore) {
      const params = ['limit=100'];
      if (acctCursor) params.push('starting_after=' + encodeURIComponent(acctCursor));
      const url = INSTANTLY_BASE + '/accounts?' + params.join('&');

      const resp = await fetch(url, { headers });
      if (!resp.ok) { console.error('Accounts API error:', resp.status); break; }
      const data = await resp.json();
      const items = data.items || data || [];
      stats.fetched += items.length;

      for (const acct of items) {
        const acctId = acct.id || acct.email;
        if (!acctId) continue;

        const row = {
          user_id: userId,
          instantly_id: acctId,
          email: acct.email || '',
          first_name: acct.first_name || '',
          last_name: acct.last_name || '',
          status: acct.status || '',
          warmup_status: acct.warmup_status || acct.warmup || '',
          daily_limit: acct.daily_limit || acct.sending_limit || 0,
          health_score: acct.health_score || 0,
          sent_today: acct.sent_today || acct.today_sent || 0,
          replies_today: acct.replies_today || 0,
          bounced_today: acct.bounced_today || 0,
          metadata: JSON.stringify({
            provider: acct.provider || '',
            domain: acct.domain || ''
          }),
          synced_at: new Date().toISOString()
        };

        const { error } = await client
          .from('instantly_accounts')
          .upsert(row, { onConflict: 'user_id,instantly_id' });

        if (error) { stats.skipped++; } else { stats.inserted++; }
      }

      acctCursor = data.next_starting_after || null;
      acctHasMore = !!acctCursor && items.length > 0;
    }

    await updateSyncStatus(userId, 'instantly', 'ok', stats.inserted + ' synced' + (stats.skipped ? ', ' + stats.skipped + ' skipped' : ''));
    await logSync(userId, 'instantly', 'poll', stats);
    return stats;
  } catch (e) {
    stats.error = e.message;
    await updateSyncStatus(userId, 'instantly', 'error', e.message);
    await logSync(userId, 'instantly', 'poll', stats);
    throw e;
  }
}

module.exports = { syncInstantly };
