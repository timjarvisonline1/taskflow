const { getServiceClient, getCredentials, updateSyncStatus, logSync } = require('./supabase');

const INSTANTLY_BASE = 'https://api.instantly.ai/api/v2';

/**
 * Safe fetch + JSON parse helper with timing.
 */
async function apiFetch(url, options, label) {
  const t0 = Date.now();
  console.log('[API→] ' + (label || 'fetch') + ': ' + url.replace(INSTANTLY_BASE, ''));
  const resp = await fetch(url, options);
  const elapsed = Date.now() - t0;
  if (!resp.ok) {
    let body = '';
    try { body = await resp.text(); } catch (e) { /* ignore */ }
    console.log('[API✗] ' + (label || 'fetch') + ' FAILED ' + resp.status + ' (' + elapsed + 'ms): ' + body.substring(0, 200));
    throw new Error('Instantly API ' + resp.status + ': ' + body.substring(0, 300));
  }
  const text = await resp.text();
  console.log('[API✓] ' + (label || 'fetch') + ' ' + resp.status + ' (' + elapsed + 'ms, ' + text.length + ' bytes)');
  if (!text || !text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error('Instantly API returned non-JSON: ' + text.substring(0, 200));
  }
}

/**
 * Check if a Supabase table exists by doing a tiny select.
 */
async function tableExists(client, tableName, userId) {
  try {
    const { error } = await client.from(tableName).select('id').eq('user_id', userId).limit(1);
    console.log('[DB] tableExists(' + tableName + '): ' + (!error ? 'YES' : 'NO — ' + (error.message || '')));
    return !error;
  } catch (e) {
    console.log('[DB] tableExists(' + tableName + '): EXCEPTION — ' + e.message);
    return false;
  }
}

/**
 * Run async tasks in parallel with a concurrency limit.
 */
async function parallelLimit(tasks, limit) {
  const results = [];
  let i = 0;
  async function next() {
    const idx = i++;
    if (idx >= tasks.length) return;
    try { results[idx] = await tasks[idx](); } catch (e) { results[idx] = null; }
    await next();
  }
  const workers = [];
  for (let w = 0; w < Math.min(limit, tasks.length); w++) workers.push(next());
  await Promise.all(workers);
  return results;
}

async function syncInstantly(userId) {
  const syncStart = Date.now();
  function elapsed() { return ((Date.now() - syncStart) / 1000).toFixed(1) + 's'; }
  function hasTimeBudget() { return (Date.now() - syncStart) < 40000; }

  console.log('═══════════ INSTANTLY SYNC START ═══════════');
  console.log('[SYNC] userId: ' + userId);

  const cred = await getCredentials(userId, 'instantly');
  if (!cred) throw new Error('Instantly not connected');

  const apiKey = cred.credentials ? cred.credentials.api_key : null;
  if (!apiKey) throw new Error('Instantly API key missing');
  console.log('[SYNC] Got API key (' + elapsed() + ')');

  const headers = { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' };
  const stats = { fetched: 0, inserted: 0, updated: 0, skipped: 0, error: '' };
  const client = getServiceClient();

  try {
    // ═══════════ 1. SYNC CAMPAIGNS ═══════════
    console.log('[SYNC] ══ Section 1: Campaigns (' + elapsed() + ') ══');
    const campaignMap = {};
    const campaignStatuses = {};
    let campaignCursor = null;
    let campaignHasMore = true;
    let campaignPageNum = 0;

    while (campaignHasMore) {
      campaignPageNum++;
      const params = ['limit=100'];
      if (campaignCursor) params.push('starting_after=' + encodeURIComponent(campaignCursor));

      const data = await apiFetch(
        INSTANTLY_BASE + '/campaigns?' + params.join('&'),
        { headers },
        'campaigns-page-' + campaignPageNum
      );
      const items = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []);
      console.log('[SYNC] Campaigns page ' + campaignPageNum + ': ' + items.length + ' items');
      stats.fetched += items.length;

      for (const c of items) {
        const instantlyId = c.id || c.campaign_id;
        if (!instantlyId) continue;

        const statusNum = typeof c.status === 'number' ? c.status : null;
        const statusStr = statusNum !== null
          ? ({ '0': 'draft', '1': 'active', '-1': 'paused', '2': 'completed' }[String(statusNum)] || String(statusNum))
          : (c.status || '');
        campaignStatuses[instantlyId] = statusStr;

        const row = {
          user_id: userId,
          instantly_id: instantlyId,
          name: c.name || '',
          status: statusStr,
          created_at_ext: c.timestamp_created || c.timestamp || c.created_at || null,
          metadata: JSON.stringify(c || {}),
          synced_at: new Date().toISOString()
        };

        const { data: upserted, error } = await client
          .from('instantly_campaigns')
          .upsert(row, { onConflict: 'user_id,instantly_id' })
          .select('id')
          .single();

        if (error) {
          console.error('[DB✗] Campaign upsert failed for ' + instantlyId + ': ' + error.message);
          stats.skipped++;
          continue;
        }
        if (upserted) campaignMap[instantlyId] = upserted.id;
        stats.inserted++;
      }

      campaignCursor = data.next_starting_after || null;
      campaignHasMore = !!campaignCursor && items.length > 0;
    }

    // Build full campaign lookup
    const { data: allCampaigns } = await client
      .from('instantly_campaigns')
      .select('id, instantly_id')
      .eq('user_id', userId);
    if (allCampaigns) {
      allCampaigns.forEach(function(c) {
        if (!campaignMap[c.instantly_id]) campaignMap[c.instantly_id] = c.id;
      });
    }

    const campaignIds = Object.keys(campaignMap);
    const activeCampaignIds = campaignIds.filter(function(id) {
      var s = campaignStatuses[id] || '';
      return s === 'active' || s === 'paused' || s === '1' || s === '-1';
    });
    console.log('[SYNC] Total campaigns: ' + campaignIds.length + ', active/paused: ' + activeCampaignIds.length + ' (' + elapsed() + ')');
    for (const id of campaignIds) {
      console.log('[SYNC]   ' + id + ' → status=' + (campaignStatuses[id] || '?') + ', supaId=' + campaignMap[id]);
    }

    // ═══════════ 2. SYNC ACCOUNTS ═══════════
    console.log('[SYNC] ══ Section 2: Accounts (' + elapsed() + ') ══');
    try {
      let acctCursor = null;
      let acctHasMore = true;
      let acctCount = 0;

      while (acctHasMore) {
        const params = ['limit=100'];
        if (acctCursor) params.push('starting_after=' + encodeURIComponent(acctCursor));

        const data = await apiFetch(
          INSTANTLY_BASE + '/accounts?' + params.join('&'),
          { headers },
          'accounts'
        );
        const items = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []);
        stats.fetched += items.length;
        acctCount += items.length;

        for (const acct of items) {
          const acctId = acct.id || acct.email;
          if (!acctId) continue;

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

          if (error) {
            console.error('[DB✗] Account upsert failed for ' + acctId + ': ' + error.message);
            stats.skipped++;
          } else { stats.inserted++; }
        }

        acctCursor = data.next_starting_after || null;
        acctHasMore = !!acctCursor && items.length > 0;
      }
      console.log('[SYNC] Accounts synced: ' + acctCount + ' (' + elapsed() + ')');
    } catch (e) { console.error('[SYNC✗] Accounts error: ' + e.message); }

    // ═══════════ 3. CAMPAIGN ANALYTICS (1 bulk call) ═══════════
    console.log('[SYNC] ══ Section 3: Campaign Analytics (' + elapsed() + ') ══');
    try {
      if (campaignIds.length) {
        const idsParam = campaignIds.map(function(id) { return 'ids=' + encodeURIComponent(id); }).join('&');
        const analyticsData = await apiFetch(
          INSTANTLY_BASE + '/campaigns/analytics?' + idsParam,
          { headers },
          'analytics-bulk'
        );
        const entries = Array.isArray(analyticsData) ? analyticsData : (analyticsData.items || analyticsData.data || []);
        console.log('[SYNC] Analytics entries: ' + entries.length);

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
      console.log('[SYNC] Section 3 done (' + elapsed() + ')');
    } catch (e) { console.error('[SYNC✗] Analytics error: ' + e.message + ' (' + elapsed() + ')'); }

    // ═══════════ 4. CAMPAIGN ANALYTICS OVERVIEW (1 bulk call) ═══════════
    console.log('[SYNC] ══ Section 4: Analytics Overview (' + elapsed() + ') ══');
    try {
      if (campaignIds.length) {
        const idsParam = campaignIds.map(function(id) { return 'ids=' + encodeURIComponent(id); }).join('&');
        const overviewData = await apiFetch(
          INSTANTLY_BASE + '/campaigns/analytics/overview?' + idsParam,
          { headers },
          'analytics-overview'
        );
        const overviewEntries = Array.isArray(overviewData) ? overviewData :
          (overviewData.items || overviewData.data || (overviewData.campaign_id ? [overviewData] : []));
        console.log('[SYNC] Overview entries: ' + overviewEntries.length);

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
      console.log('[SYNC] Section 4 done (' + elapsed() + ')');
    } catch (e) { console.error('[SYNC✗] Overview error: ' + e.message + ' (' + elapsed() + ')'); }

    // ═══════════ PRE-CHECK: table/column existence ═══════════
    console.log('[SYNC] ══ Pre-checks (' + elapsed() + ') ══');
    const [hasDailyTable, hasStepsTable] = await Promise.all([
      tableExists(client, 'instantly_analytics_daily', userId),
      tableExists(client, 'instantly_campaign_steps', userId)
    ]);

    const [leadColResult, emailColResult, seqColResult] = await Promise.all([
      client.from('instantly_leads').select('email_open_count').eq('user_id', userId).limit(1),
      client.from('instantly_emails').select('thread_id').eq('user_id', userId).limit(1),
      client.from('instantly_campaigns').select('sequences').eq('user_id', userId).limit(1)
    ]);
    const hasLeadEnhanced = !leadColResult.error;
    const hasEmailEnhanced = !emailColResult.error;
    const hasSequences = !seqColResult.error;
    console.log('[SYNC] Feature flags: dailyTable=' + hasDailyTable + ', stepsTable=' + hasStepsTable +
      ', leadEnhanced=' + hasLeadEnhanced + ', emailEnhanced=' + hasEmailEnhanced + ', sequences=' + hasSequences +
      ' (' + elapsed() + ')');

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
      console.log('[SYNC] Lead map: ' + Object.keys(leadMap).length + ' leads');
    } catch (e) { console.error('[SYNC✗] Lead map error:', e.message); }

    // ═══════════ 5-9: PER-CAMPAIGN (parallelized) ═══════════
    console.log('[SYNC] ══ Per-campaign sections (' + elapsed() + ') ══');
    console.log('[SYNC] Processing ' + activeCampaignIds.length + ' active campaigns in parallel (max 5)');

    const perCampaignTasks = activeCampaignIds.map(function(instantlyCampaignId) {
      return async function() {
        const campStart = Date.now();
        const supaId = campaignMap[instantlyCampaignId];
        const campName = instantlyCampaignId.substring(0, 8) + '..';
        console.log('[CAMP:' + campName + '] Start (' + elapsed() + ')');

        // --- Daily analytics ---
        if (hasDailyTable && hasTimeBudget()) {
          try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 90);
            const startStr = startDate.toISOString().split('T')[0];

            const dailyData = await apiFetch(
              INSTANTLY_BASE + '/campaigns/analytics/daily?campaign_id=' +
              encodeURIComponent(instantlyCampaignId) + '&start_date=' + startStr,
              { headers },
              'daily-' + campName
            );
            const dailyEntries = Array.isArray(dailyData) ? dailyData : (dailyData.items || dailyData.data || []);
            console.log('[CAMP:' + campName + '] Daily rows: ' + dailyEntries.length);

            const dailyRows = [];
            for (const d of dailyEntries) {
              if (!d.date) continue;
              dailyRows.push({
                user_id: userId,
                campaign_id: supaId,
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
              });
            }
            if (dailyRows.length) {
              const t0 = Date.now();
              const { error } = await client.from('instantly_analytics_daily').upsert(dailyRows, { onConflict: 'user_id,campaign_id,date' });
              console.log('[CAMP:' + campName + '] Daily upsert: ' + dailyRows.length + ' rows (' + (Date.now() - t0) + 'ms)' + (error ? ' ERROR: ' + error.message : ' OK'));
              if (error) stats.skipped += dailyRows.length; else stats.updated += dailyRows.length;
            }
          } catch (e) { console.error('[CAMP:' + campName + '] Daily error: ' + e.message); }
        } else if (!hasDailyTable) {
          console.log('[CAMP:' + campName + '] Skipping daily (table missing)');
        }

        // --- Campaign details ---
        if (hasSequences && hasTimeBudget()) {
          try {
            const detail = await apiFetch(
              INSTANTLY_BASE + '/campaigns/' + encodeURIComponent(instantlyCampaignId),
              { headers },
              'detail-' + campName
            );
            const updateData = {};
            if (detail.sequences) updateData.sequences = JSON.stringify(detail.sequences);
            if (detail.campaign_schedule) updateData.campaign_schedule = JSON.stringify(detail.campaign_schedule);
            if (detail.email_list) updateData.email_list = JSON.stringify(detail.email_list);
            if (detail.daily_limit !== undefined) updateData.daily_limit = detail.daily_limit || 0;
            if (detail.stop_on_reply !== undefined) updateData.stop_on_reply = !!detail.stop_on_reply;
            const fieldCount = Object.keys(updateData).length;
            if (fieldCount) {
              updateData.synced_at = new Date().toISOString();
              await client.from('instantly_campaigns').update(updateData).eq('id', supaId);
              stats.updated++;
              console.log('[CAMP:' + campName + '] Detail: ' + fieldCount + ' fields updated');
            }
          } catch (e) { console.error('[CAMP:' + campName + '] Detail error: ' + e.message); }
        } else if (!hasSequences) {
          console.log('[CAMP:' + campName + '] Skipping detail (sequences column missing)');
        }

        // --- Step analytics ---
        if (hasStepsTable && hasTimeBudget()) {
          try {
            const stepData = await apiFetch(
              INSTANTLY_BASE + '/campaigns/analytics/steps?campaign_id=' + encodeURIComponent(instantlyCampaignId),
              { headers },
              'steps-' + campName
            );
            const stepEntries = Array.isArray(stepData) ? stepData : (stepData.items || stepData.data || []);
            console.log('[CAMP:' + campName + '] Steps: ' + stepEntries.length);

            const stepRows = [];
            for (const s of stepEntries) {
              stepRows.push({
                user_id: userId,
                campaign_id: supaId,
                step: s.step !== undefined ? s.step : (s.step_number || 0),
                variant: s.variant || s.variant_label || 'A',
                sent: s.sent || 0,
                opened: s.opened || 0,
                unique_opened: s.unique_opened || 0,
                replies: s.replies || 0,
                unique_replies: s.unique_replies || 0,
                clicks: s.clicks || 0,
                unique_clicks: s.unique_clicks || 0,
                opportunities: s.opportunities || 0,
                synced_at: new Date().toISOString()
              });
            }
            if (stepRows.length) {
              const { error } = await client.from('instantly_campaign_steps').upsert(stepRows, { onConflict: 'user_id,campaign_id,step,variant' });
              if (error) stats.skipped += stepRows.length; else stats.updated += stepRows.length;
            }
          } catch (e) { console.error('[CAMP:' + campName + '] Steps error: ' + e.message); }
        } else if (!hasStepsTable) {
          console.log('[CAMP:' + campName + '] Skipping steps (table missing)');
        }

        // --- Leads (1 page) ---
        if (hasTimeBudget()) {
          try {
            const data = await apiFetch(INSTANTLY_BASE + '/leads/list', {
              method: 'POST', headers: headers,
              body: JSON.stringify({ campaign_id: instantlyCampaignId, limit: 100 })
            }, 'leads-' + campName);
            const items = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []);
            console.log('[CAMP:' + campName + '] Leads: ' + items.length);
            stats.fetched += items.length;

            const leadRows = [];
            for (const lead of items) {
              const leadId = lead.id || lead.lead_id;
              if (!leadId) continue;

              const row = {
                user_id: userId,
                instantly_id: leadId,
                campaign_id: supaId,
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

              if (hasLeadEnhanced) {
                row.email_open_count = lead.email_open_count || lead.open_count || 0;
                row.email_reply_count = lead.email_reply_count || lead.reply_count || 0;
                row.email_click_count = lead.email_click_count || lead.click_count || 0;
                if (lead.timestamp_last_open) row.timestamp_last_open = lead.timestamp_last_open;
                if (lead.timestamp_last_reply) row.timestamp_last_reply = lead.timestamp_last_reply;
                if (lead.timestamp_last_click) row.timestamp_last_click = lead.timestamp_last_click;
                if (lead.timestamp_last_interest_change) row.timestamp_last_interest_change = lead.timestamp_last_interest_change;
                row.lead_score = lead.pl_value_lead || lead.lead_score || '';
                row.is_website_visitor = lead.is_website_visitor === true || lead.is_website_visitor === 1;
                row.last_step_id = lead.last_step_id || '';
                row.last_step_from = lead.last_step_from || '';
                row.verification_status = lead.verification_status || '';
              }

              leadRows.push(row);
            }
            if (leadRows.length) {
              const t0 = Date.now();
              const { error } = await client.from('instantly_leads').upsert(leadRows, { onConflict: 'user_id,instantly_id' });
              console.log('[CAMP:' + campName + '] Leads upsert: ' + leadRows.length + ' rows (' + (Date.now() - t0) + 'ms)' + (error ? ' ERROR: ' + error.message : ' OK'));
              if (error) { stats.skipped += leadRows.length; } else { stats.inserted += leadRows.length; }
            }
          } catch (e) { console.error('[CAMP:' + campName + '] Leads error: ' + e.message); }
        }

        // --- Emails (1 page) ---
        if (hasTimeBudget()) {
          try {
            const emailUrl = INSTANTLY_BASE + '/emails?campaign_id=' + encodeURIComponent(instantlyCampaignId) + '&limit=100';
            const data = await apiFetch(emailUrl, { headers }, 'emails-' + campName);
            const items = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []);
            console.log('[CAMP:' + campName + '] Emails: ' + items.length);
            stats.fetched += items.length;

            const emailRows = [];
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
              const previewText = (bodyText || bodyHtml || '').replace(/<[^>]*>/g, '').substring(0, 150);

              const row = {
                user_id: userId,
                instantly_id: emailId,
                lead_id: supaLeadId,
                campaign_id: supaId,
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

              if (hasEmailEnhanced) {
                row.thread_id = email.thread_id || '';
                row.is_unread = email.is_unread === true || email.is_unread === 1 || false;
                row.i_status = typeof email.i_status === 'number' ? email.i_status : (email.interest_status || 0);
                row.content_preview = previewText;
                row.eaccount = email.eaccount || email.from_address_email || email.from_email || '';
              }

              emailRows.push(row);
            }
            if (emailRows.length) {
              const t0 = Date.now();
              const { error } = await client.from('instantly_emails').upsert(emailRows, { onConflict: 'user_id,instantly_id' });
              console.log('[CAMP:' + campName + '] Emails upsert: ' + emailRows.length + ' rows (' + (Date.now() - t0) + 'ms)' + (error ? ' ERROR: ' + error.message : ' OK'));
              if (error) { stats.skipped += emailRows.length; } else { stats.inserted += emailRows.length; }
            }
          } catch (e) { console.error('[CAMP:' + campName + '] Emails error: ' + e.message); }
        }

        const campElapsed = ((Date.now() - campStart) / 1000).toFixed(1);
        console.log('[CAMP:' + campName + '] Done (' + campElapsed + 's, total ' + elapsed() + ')');
      };
    });

    if (perCampaignTasks.length) {
      await parallelLimit(perCampaignTasks, 5);
    }

    console.log('═══════════ INSTANTLY SYNC COMPLETE (' + elapsed() + ') ═══════════');
    console.log('[SYNC] Stats: fetched=' + stats.fetched + ', inserted=' + stats.inserted + ', updated=' + stats.updated + ', skipped=' + stats.skipped);

    await updateSyncStatus(userId, 'instantly', 'ok', stats.inserted + ' synced' + (stats.skipped ? ', ' + stats.skipped + ' skipped' : ''));
    await logSync(userId, 'instantly', 'poll', stats);
    return stats;
  } catch (e) {
    console.error('═══════════ INSTANTLY SYNC FAILED (' + elapsed() + '): ' + e.message + ' ═══════════');
    stats.error = e.message;
    await updateSyncStatus(userId, 'instantly', 'error', e.message);
    await logSync(userId, 'instantly', 'poll', stats);
    throw e;
  }
}

module.exports = { syncInstantly };
