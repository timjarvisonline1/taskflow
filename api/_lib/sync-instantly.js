const { getServiceClient, getCredentials, updateSyncStatus, logSync } = require('./supabase');

const INSTANTLY_BASE = 'https://api.instantly.ai/api/v2';

/**
 * Safe fetch + JSON parse helper. Returns parsed JSON or throws with descriptive error.
 */
async function apiFetch(url, options) {
  const resp = await fetch(url, options);
  if (!resp.ok) {
    let body = '';
    try { body = await resp.text(); } catch (e) { /* ignore */ }
    throw new Error('Instantly API ' + resp.status + ': ' + body.substring(0, 300));
  }
  const text = await resp.text();
  if (!text || !text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error('Instantly API returned non-JSON: ' + text.substring(0, 200));
  }
}

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

      const data = await apiFetch(url, { headers });
      const items = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []);
      stats.fetched += items.length;

      for (const c of items) {
        const instantlyId = c.id || c.campaign_id;
        if (!instantlyId) continue;

        const row = {
          user_id: userId,
          instantly_id: instantlyId,
          name: c.name || '',
          status: (typeof c.status === 'number')
            ? ({ '0': 'draft', '1': 'active', '-1': 'paused', '2': 'completed' }[String(c.status)] || String(c.status))
            : (c.status || ''),
          created_at_ext: c.timestamp_created || c.timestamp || c.created_at || null,
          metadata: JSON.stringify(c || {}),
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
      const campaignIds = Object.keys(campaignMap);
      if (campaignIds.length) {
        const idsParam = campaignIds.map(function(id) { return 'ids=' + encodeURIComponent(id); }).join('&');
        const analyticsData = await apiFetch(
          INSTANTLY_BASE + '/campaigns/analytics?' + idsParam,
          { headers: headers }
        );
        // Response may be array, or {items:[...]}, or {data:[...]}
        const entries = Array.isArray(analyticsData) ? analyticsData : (analyticsData.items || analyticsData.data || []);
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
          stats.updated++;
        }
      }
    } catch (e) { console.error('Campaign analytics sync error:', e.message); }

    // ═══════════ 3. SYNC LEADS (per campaign) ═══════════
    for (const instantlyCampaignId of Object.keys(campaignMap)) {
      const supabaseCampaignId = campaignMap[instantlyCampaignId];
      let leadCursor = null;
      let leadHasMore = true;

      try {
        while (leadHasMore) {
          const reqBody = { campaign_id: instantlyCampaignId, limit: 100 };
          if (leadCursor) reqBody.starting_after = leadCursor;

          const data = await apiFetch(INSTANTLY_BASE + '/leads/list', {
            method: 'POST', headers: headers, body: JSON.stringify(reqBody)
          });
          const items = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []);
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
      } catch (e) { console.error('Leads sync error for campaign ' + instantlyCampaignId + ':', e.message); }
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
    for (const instantlyCampaignId of Object.keys(campaignMap)) {
      const supabaseCampaignId = campaignMap[instantlyCampaignId];
      let emailCursor = null;
      let emailHasMore = true;

      try {
        while (emailHasMore) {
          const params = ['campaign_id=' + encodeURIComponent(instantlyCampaignId), 'limit=100'];
          if (emailCursor) params.push('starting_after=' + encodeURIComponent(emailCursor));
          const url = INSTANTLY_BASE + '/emails?' + params.join('&');

          const data = await apiFetch(url, { headers });
          const items = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []);
          stats.fetched += items.length;

          for (const email of items) {
            const emailId = email.id || email.email_id;
            if (!emailId) continue;

            // Determine if this is a reply (inbound) or outbound
            const isReply = email.is_reply === true || email.is_reply === 1 ||
                            email.type === 'reply' || email.direction === 'inbound';
            const direction = isReply ? 'inbound' : 'outbound';

            // Try to link to a lead via lead email
            const leadEmail = email.lead || '';
            const leadInstantlyId = email.lead_id || '';
            const supaLeadId = leadMap[leadInstantlyId] || null;

            // Extract body — Instantly may nest body as {html, text} or give flat string
            let bodyHtml = '';
            let bodyText = '';
            if (email.body && typeof email.body === 'object') {
              bodyHtml = email.body.html || '';
              bodyText = email.body.text || '';
            } else {
              bodyHtml = email.body || email.html_body || '';
              bodyText = email.text_body || email.body_text || '';
            }

            const row = {
              user_id: userId,
              instantly_id: emailId,
              lead_id: supaLeadId,
              campaign_id: supabaseCampaignId,
              from_email: email.from_address_email || email.from_address || email.from_email || email.from || '',
              from_name: email.from_address_name || email.from_name || '',
              to_email: email.to_address_email || email.to_address || email.to_email || email.to || '',
              subject: email.subject || '',
              body: bodyHtml,
              body_text: bodyText,
              timestamp_ext: email.timestamp_email || email.timestamp_created || email.timestamp || null,
              is_reply: isReply,
              direction: direction,
              metadata: JSON.stringify({
                campaign_instantly_id: instantlyCampaignId,
                thread_id: email.thread_id || '',
                message_id: email.message_id || '',
                lead_email: leadEmail
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
      } catch (e) { console.error('Emails sync error for campaign ' + instantlyCampaignId + ':', e.message); }
    }

    // ═══════════ 5. SYNC ACCOUNTS (sending accounts) ═══════════
    try {
      let acctCursor = null;
      let acctHasMore = true;

      while (acctHasMore) {
        const params = ['limit=100'];
        if (acctCursor) params.push('starting_after=' + encodeURIComponent(acctCursor));
        const url = INSTANTLY_BASE + '/accounts?' + params.join('&');

        const data = await apiFetch(url, { headers });
        const items = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []);
        stats.fetched += items.length;

        for (const acct of items) {
          const acctId = acct.id || acct.email;
          if (!acctId) continue;

          // warmup_status may be nested in acct.warmup object
          let warmupStatus = acct.warmup_status || '';
          if (!warmupStatus && acct.warmup && typeof acct.warmup === 'object') {
            warmupStatus = acct.warmup.status || '';
          }

          // Map numeric status to readable string
          // Instantly uses: 1=active, -1=paused, -2=error, 0=setup_pending
          const statusMap = { '1': 'active', '-1': 'paused', '-2': 'error', '0': 'pending' };
          let acctStatus = acct.status;
          if (typeof acctStatus === 'number') acctStatus = statusMap[String(acctStatus)] || String(acctStatus);
          if (!acctStatus) acctStatus = acct.setup_pending ? 'pending' : '';

          const row = {
            user_id: userId,
            instantly_id: acctId,
            email: acct.email || '',
            first_name: acct.first_name || '',
            last_name: acct.last_name || '',
            status: acctStatus,
            warmup_status: warmupStatus,
            daily_limit: acct.daily_limit || acct.sending_limit || 0,
            health_score: acct.stat_warmup_score || acct.health_score || 0,
            sent_today: acct.sent_today || acct.today_sent || 0,
            replies_today: acct.replies_today || 0,
            bounced_today: acct.bounced_today || 0,
            metadata: JSON.stringify({
              provider: acct.provider_code || acct.provider || '',
              domain: acct.tracking_domain_name || acct.domain || '',
              sending_gap: acct.sending_gap || 0
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
    } catch (e) { console.error('Accounts sync error:', e.message); }

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
