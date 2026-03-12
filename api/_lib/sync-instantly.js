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

/**
 * Check if a Supabase table exists by doing a tiny select. Returns true/false.
 */
async function tableExists(client, tableName, userId) {
  try {
    const { error } = await client.from(tableName).select('id').eq('user_id', userId).limit(1);
    return !error;
  } catch (e) { return false; }
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
    // ═══════════ 1. SYNC CAMPAIGNS (1 paginated API call) ═══════════
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

    const campaignIds = Object.keys(campaignMap);
    console.log('Instantly sync: ' + campaignIds.length + ' campaigns');

    // ═══════════ 2. SYNC ACCOUNTS (1 paginated API call) ═══════════
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

          // warmup_status may be numeric or nested in acct.warmup object
          let warmupStatus = '';
          if (acct.warmup_status !== undefined && acct.warmup_status !== null) {
            warmupStatus = String(acct.warmup_status);
          } else if (acct.warmup && typeof acct.warmup === 'object') {
            warmupStatus = acct.warmup.status !== undefined ? String(acct.warmup.status) : '';
          }
          const warmupMap = { '1': 'active', '0': 'paused', '-1': 'disabled' };
          if (warmupMap[warmupStatus]) warmupStatus = warmupMap[warmupStatus];

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

          if (error) { console.error('Account upsert error:', acctId, error.message); stats.skipped++; } else { stats.inserted++; }
        }

        acctCursor = data.next_starting_after || null;
        acctHasMore = !!acctCursor && items.length > 0;
      }
    } catch (e) { console.error('Accounts sync error:', e.message); }

    // ═══════════ 3. SYNC CAMPAIGN ANALYTICS (1 bulk API call) ═══════════
    try {
      if (campaignIds.length) {
        const idsParam = campaignIds.map(function(id) { return 'ids=' + encodeURIComponent(id); }).join('&');
        const analyticsData = await apiFetch(
          INSTANTLY_BASE + '/campaigns/analytics?' + idsParam,
          { headers: headers }
        );
        const entries = Array.isArray(analyticsData) ? analyticsData : (analyticsData.items || analyticsData.data || []);
        for (const a of entries) {
          const cId = a.campaign_id || a.id;
          const supaId = campaignMap[cId];
          if (!supaId) continue;

          const leadsCount = a.leads_count || 0;
          const contactedCount = a.contacted_count || 0;
          const repliesCount = a.reply_count || 0;
          const bouncedCount = a.bounced_count || 0;
          const openCount = a.open_count || 0;
          const clickCount = a.link_click_count || 0;
          const total = contactedCount || leadsCount || 1;

          await client.from('instantly_campaigns').update({
            leads_count: leadsCount,
            contacted_count: contactedCount,
            replies_count: repliesCount,
            bounced_count: bouncedCount,
            open_rate: openCount ? openCount / total : 0,
            reply_rate: repliesCount ? repliesCount / total : 0,
            open_count: openCount,
            click_count: clickCount,
            unsubscribed_count: a.unsubscribed_count || 0,
            completed_count: a.completed_count || 0,
            total_opportunities: a.total_opportunities || 0,
            total_opportunity_value: a.total_opportunity_value || 0,
            synced_at: new Date().toISOString()
          }).eq('id', supaId);
          stats.updated++;
        }
      }
    } catch (e) { console.error('Campaign analytics sync error:', e.message); }

    // ═══════════ 4. SYNC CAMPAIGN ANALYTICS OVERVIEW (1 bulk API call) ═══════════
    try {
      if (campaignIds.length) {
        const idsParam = campaignIds.map(function(id) { return 'ids=' + encodeURIComponent(id); }).join('&');
        const overviewData = await apiFetch(
          INSTANTLY_BASE + '/campaigns/analytics/overview?' + idsParam,
          { headers: headers }
        );
        // Overview may be a single aggregate object or array of per-campaign objects
        const overviewEntries = Array.isArray(overviewData) ? overviewData :
          (overviewData.items || overviewData.data || (overviewData.campaign_id ? [overviewData] : []));

        for (const o of overviewEntries) {
          const cId = o.campaign_id || o.id;
          const supaId = cId ? campaignMap[cId] : null;
          if (!supaId) continue;

          const updateData = {
            total_interested: o.total_interested || 0,
            total_meeting_booked: o.total_meeting_booked || 0,
            total_meeting_completed: o.total_meeting_completed || 0,
            total_closed: o.total_closed || 0,
            synced_at: new Date().toISOString()
          };
          if (o.open_count) updateData.open_count = o.open_count;
          if (o.reply_count) updateData.replies_count = o.reply_count;
          if (o.link_click_count) updateData.click_count = o.link_click_count;

          await client.from('instantly_campaigns').update(updateData).eq('id', supaId);
          stats.updated++;
        }
      }
    } catch (e) { console.error('Campaign overview sync error:', e.message); }

    // ═══════════ 5. SYNC DAILY ANALYTICS (N API calls — only if table exists) ═══════════
    try {
      const hasDailyTable = await tableExists(client, 'instantly_analytics_daily', userId);
      if (hasDailyTable && campaignIds.length) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 90);
        const startStr = startDate.toISOString().split('T')[0];

        for (const instantlyCampaignId of campaignIds) {
          const supabaseCampaignId = campaignMap[instantlyCampaignId];
          try {
            const dailyData = await apiFetch(
              INSTANTLY_BASE + '/campaigns/analytics/daily?campaign_id=' +
              encodeURIComponent(instantlyCampaignId) + '&start_date=' + startStr,
              { headers: headers }
            );
            const dailyEntries = Array.isArray(dailyData) ? dailyData : (dailyData.items || dailyData.data || []);
            for (const d of dailyEntries) {
              if (!d.date) continue;
              const row = {
                user_id: userId,
                campaign_id: supabaseCampaignId,
                date: d.date,
                sent: d.sent || 0,
                contacted: d.contacted || 0,
                new_leads_contacted: d.new_leads_contacted || 0,
                opened: d.opened || 0,
                unique_opened: d.unique_opened || 0,
                replies: d.replies || 0,
                unique_replies: d.unique_replies || 0,
                clicks: d.clicks || 0,
                unique_clicks: d.unique_clicks || 0,
                bounced: d.bounced || 0,
                opportunities: d.opportunities || d.unique_opportunities || 0,
                synced_at: new Date().toISOString()
              };
              const { error } = await client
                .from('instantly_analytics_daily')
                .upsert(row, { onConflict: 'user_id,campaign_id,date' });
              if (error) { stats.skipped++; } else { stats.updated++; }
            }
          } catch (e) { console.error('Daily analytics sync error for campaign ' + instantlyCampaignId + ':', e.message); }
        }
      }
    } catch (e) { console.error('Daily analytics sync error:', e.message); }

    // ═══════════ 6. SYNC CAMPAIGN DETAILS (N API calls — only if columns exist) ═══════════
    try {
      // Test if the sequences column exists
      const { error: colTest } = await client.from('instantly_campaigns').select('sequences').eq('user_id', userId).limit(1);
      if (!colTest) {
        for (const instantlyCampaignId of campaignIds) {
          const supaId = campaignMap[instantlyCampaignId];
          try {
            const detail = await apiFetch(
              INSTANTLY_BASE + '/campaigns/' + encodeURIComponent(instantlyCampaignId),
              { headers: headers }
            );
            const updateData = {};
            if (detail.sequences) updateData.sequences = JSON.stringify(detail.sequences);
            if (detail.campaign_schedule) updateData.campaign_schedule = JSON.stringify(detail.campaign_schedule);
            if (detail.email_list) updateData.email_list = JSON.stringify(detail.email_list);
            if (detail.daily_limit !== undefined) updateData.daily_limit = detail.daily_limit || 0;
            if (detail.stop_on_reply !== undefined) updateData.stop_on_reply = !!detail.stop_on_reply;
            if (Object.keys(updateData).length) {
              updateData.synced_at = new Date().toISOString();
              await client.from('instantly_campaigns').update(updateData).eq('id', supaId);
              stats.updated++;
            }
          } catch (e) { console.error('Campaign detail sync error for ' + instantlyCampaignId + ':', e.message); }
        }
      } else {
        console.log('Skipping campaign details sync — sequences column not found (run enhance-instantly-campaigns.sql)');
      }
    } catch (e) { console.error('Campaign details sync error:', e.message); }

    // ═══════════ 7. SYNC CAMPAIGN STEP ANALYTICS (N API calls — only if table exists) ═══════════
    try {
      const hasStepsTable = await tableExists(client, 'instantly_campaign_steps', userId);
      if (hasStepsTable && campaignIds.length) {
        for (const instantlyCampaignId of campaignIds) {
          const supaId = campaignMap[instantlyCampaignId];
          try {
            const stepData = await apiFetch(
              INSTANTLY_BASE + '/campaigns/analytics/steps?campaign_id=' + encodeURIComponent(instantlyCampaignId),
              { headers: headers }
            );
            const stepEntries = Array.isArray(stepData) ? stepData : (stepData.items || stepData.data || []);
            for (const s of stepEntries) {
              const stepNum = s.step !== undefined ? s.step : (s.step_number || 0);
              const variant = s.variant || s.variant_label || 'A';
              const row = {
                user_id: userId,
                campaign_id: supaId,
                step: stepNum,
                variant: variant,
                sent: s.sent || 0,
                opened: s.opened || 0,
                unique_opened: s.unique_opened || 0,
                replies: s.replies || 0,
                unique_replies: s.unique_replies || 0,
                clicks: s.clicks || 0,
                unique_clicks: s.unique_clicks || 0,
                opportunities: s.opportunities || 0,
                synced_at: new Date().toISOString()
              };
              const { error } = await client
                .from('instantly_campaign_steps')
                .upsert(row, { onConflict: 'user_id,campaign_id,step,variant' });
              if (error) { stats.skipped++; } else { stats.updated++; }
            }
          } catch (e) { console.error('Step analytics sync error for ' + instantlyCampaignId + ':', e.message); }
        }
      }
    } catch (e) { console.error('Step analytics sync error:', e.message); }

    // ═══════════ 8. SYNC LEADS (N paginated API calls — limited to 1 page per campaign) ═══════════
    try {
      for (const instantlyCampaignId of campaignIds) {
        const supabaseCampaignId = campaignMap[instantlyCampaignId];
        try {
          const data = await apiFetch(INSTANTLY_BASE + '/leads/list', {
            method: 'POST', headers: headers,
            body: JSON.stringify({ campaign_id: instantlyCampaignId, limit: 100 })
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
        } catch (e) { console.error('Leads sync error for campaign ' + instantlyCampaignId + ':', e.message); }
      }
    } catch (e) { console.error('Leads sync error:', e.message); }

    // ═══════════ 9. SYNC EMAILS (N paginated API calls — limited to 1 page per campaign) ═══════════
    try {
      // Build lead lookup
      const leadMap = {};
      try {
        const { data: allLeads } = await client
          .from('instantly_leads')
          .select('id, instantly_id')
          .eq('user_id', userId);
        if (allLeads) {
          allLeads.forEach(function(l) { leadMap[l.instantly_id] = l.id; });
        }
      } catch (e) { console.error('Lead map query error:', e.message); }

      for (const instantlyCampaignId of campaignIds) {
        const supabaseCampaignId = campaignMap[instantlyCampaignId];
        try {
          const url = INSTANTLY_BASE + '/emails?campaign_id=' + encodeURIComponent(instantlyCampaignId) + '&limit=100';
          const data = await apiFetch(url, { headers });
          const items = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []);
          stats.fetched += items.length;

          for (const email of items) {
            const emailId = email.id || email.email_id;
            if (!emailId) continue;

            const isReply = email.is_reply === true || email.is_reply === 1 ||
                            email.type === 'reply' || email.direction === 'inbound';
            const direction = isReply ? 'inbound' : 'outbound';

            const leadInstantlyId = email.lead_id || '';
            const supaLeadId = leadMap[leadInstantlyId] || null;

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
                lead_email: email.lead || ''
              }),
              synced_at: new Date().toISOString()
            };

            const { error } = await client
              .from('instantly_emails')
              .upsert(row, { onConflict: 'user_id,instantly_id' });

            if (error) { stats.skipped++; } else { stats.inserted++; }
          }
        } catch (e) { console.error('Emails sync error for campaign ' + instantlyCampaignId + ':', e.message); }
      }
    } catch (e) { console.error('Emails sync error:', e.message); }

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
