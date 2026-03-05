const { getServiceClient, getCredentials, updateSyncStatus } = require('./supabase');
const { refreshGmailToken } = require('./gmail-auth');

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

/**
 * Sync Gmail thread metadata to Supabase.
 * Fetches recent threads and upserts metadata (no message bodies stored).
 */
async function syncGmail(userId) {
  const credRow = await getCredentials(userId, 'gmail');
  if (!credRow) throw new Error('Gmail not connected');

  const stats = { fetched: 0, inserted: 0, updated: 0, skipped: 0, error: null };

  try {
    const accessToken = await refreshGmailToken(credRow);
    const client = getServiceClient();

    // Fetch thread list (last 100 threads)
    const listResp = await fetch(GMAIL_API + '/threads?maxResults=100', {
      headers: { 'Authorization': 'Bearer ' + accessToken }
    });
    if (!listResp.ok) throw new Error('Gmail API returned ' + listResp.status);
    const listData = await listResp.json();
    const threads = listData.threads || [];
    stats.fetched = threads.length;

    // Collect user's own email addresses to exclude from matching
    const userEmails = [];
    try {
      const { data: userData } = await client.auth.admin.getUserById(userId);
      if (userData && userData.user && userData.user.email)
        userEmails.push(userData.user.email.toLowerCase());
    } catch(e) { /* ignore */ }
    try {
      const profileResp = await fetch(GMAIL_API + '/profile', {
        headers: { 'Authorization': 'Bearer ' + accessToken }
      });
      if (profileResp.ok) {
        const profile = await profileResp.json();
        if (profile.emailAddress && userEmails.indexOf(profile.emailAddress.toLowerCase()) === -1)
          userEmails.push(profile.emailAddress.toLowerCase());
      }
    } catch(e) { /* ignore */ }

    // Load client records + contacts for auto-association
    const { data: clientRecords } = await client
      .from('clients')
      .select('id, email, name')
      .eq('user_id', userId);
    const clientEmailMap = {};
    (clientRecords || []).forEach(function(c) {
      if (c.email) clientEmailMap[c.email.toLowerCase()] = c.id;
    });

    // Also match by contact emails → client_id
    const { data: contactRecords } = await client
      .from('contacts')
      .select('email, client_id')
      .eq('user_id', userId);
    const contactEmailMap = {};
    (contactRecords || []).forEach(function(c) {
      if (c.email && c.client_id) contactEmailMap[c.email.toLowerCase()] = c.client_id;
    });

    // Load email rules for server-side auto-categorization
    const { data: emailRules } = await client
      .from('email_rules')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('priority', { ascending: false });
    const activeRules = emailRules || [];

    // Fetch each thread's metadata and upsert
    for (const thread of threads) {
      try {
        const threadResp = await fetch(
          GMAIL_API + '/threads/' + thread.id + '?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Cc',
          { headers: { 'Authorization': 'Bearer ' + accessToken } }
        );
        if (!threadResp.ok) continue;
        const threadData = await threadResp.json();

        const messages = threadData.messages || [];
        if (!messages.length) continue;

        // Extract metadata from first and last message
        const firstMsg = messages[0];
        const lastMsg = messages[messages.length - 1];

        const getHeader = (msg, name) => {
          const h = (msg.payload && msg.payload.headers || []).find(h => h.name.toLowerCase() === name.toLowerCase());
          return h ? h.value : '';
        };

        const fromRaw = getHeader(firstMsg, 'From');
        const subject = getHeader(firstMsg, 'Subject');
        const toRaw = getHeader(firstMsg, 'To');
        const ccRaw = getHeader(firstMsg, 'Cc') || '';

        // Parse "Name <email>" format
        const fromMatch = fromRaw.match(/^(.+?)\s*<(.+?)>$/);
        const fromName = fromMatch ? fromMatch[1].replace(/"/g, '').trim() : '';
        const fromEmail = fromMatch ? fromMatch[2].trim() : fromRaw.trim();

        // Check labels for unread
        const lastLabels = lastMsg.labelIds || [];
        const isUnread = lastLabels.includes('UNREAD');
        const allLabels = [...new Set(messages.flatMap(m => m.labelIds || []))].join(',');

        // Parse last message From for direction tracking
        const lastFromRaw = getHeader(lastMsg, 'From');
        const lastFromMatch = lastFromRaw.match(/<(.+?)>/);
        const lastFromEmail = lastFromMatch ? lastFromMatch[1].trim() : lastFromRaw.trim();

        // Auto-associate with client by email (clients first, then contacts)
        // Check From, To, AND CC addresses
        let clientId = null;
        const parseEmails = (raw) => raw ? raw.toLowerCase().split(/[,;]/).map(e => {
          const m = e.match(/<(.+?)>/);
          return m ? m[1].trim() : e.trim();
        }).filter(e => e && e.includes('@')) : [];
        const emailsToCheck = [fromEmail.toLowerCase(), ...parseEmails(toRaw), ...parseEmails(ccRaw)]
          .filter(e => userEmails.indexOf(e) === -1);
        for (const email of emailsToCheck) {
          if (clientEmailMap[email]) {
            clientId = clientEmailMap[email];
            break;
          }
          if (!clientId && contactEmailMap[email]) {
            clientId = contactEmailMap[email];
            break;
          }
        }

        // Apply email rules if no client match found
        let ruleEndClient = null;
        let ruleCampaignId = null;
        let ruleOpportunityId = null;
        let ruleAutoArchive = false;
        if (!clientId && activeRules.length) {
          const threadData4Rules = {
            from_email: fromEmail,
            subject: subject || '',
            to: toRaw || '',
            cc: ccRaw || ''
          };
          for (const rule of activeRules) {
            const conds = rule.conditions || [];
            if (!conds.length) continue;
            let allMatch = true;
            for (const cond of conds) {
              const val = (cond.value || '').toLowerCase();
              if (!val) { allMatch = false; break; }
              const from = fromEmail.toLowerCase();
              const fromDomain = from.includes('@') ? from.split('@')[1] : '';
              const subj = (subject || '').toLowerCase();
              const toCc = ((toRaw || '') + ' ' + (ccRaw || '')).toLowerCase();
              const allP = (from + ' ' + toCc).toLowerCase();
              if (cond.type === 'from_domain_equals' && fromDomain !== val) { allMatch = false; break; }
              else if (cond.type === 'from_email_contains' && !from.includes(val)) { allMatch = false; break; }
              else if (cond.type === 'subject_contains' && !subj.includes(val)) { allMatch = false; break; }
              else if (cond.type === 'to_or_cc_contains' && !toCc.includes(val)) { allMatch = false; break; }
              else if (cond.type === 'any_participant_domain' && !allP.includes('@' + val)) { allMatch = false; break; }
            }
            if (allMatch) {
              const acts = rule.actions || [];
              for (const act of acts) {
                if (act.type === 'assign_client') {
                  const cr = (clientRecords || []).find(c => c.name === act.value);
                  if (cr) clientId = cr.id;
                } else if (act.type === 'assign_end_client') ruleEndClient = act.value;
                else if (act.type === 'assign_campaign') ruleCampaignId = act.value;
                else if (act.type === 'assign_opportunity') ruleOpportunityId = act.value;
                else if (act.type === 'auto_archive') ruleAutoArchive = true;
              }
              break; // first matching rule wins
            }
          }
        }

        // Upsert to gmail_threads
        const row = {
          user_id: userId,
          thread_id: thread.id,
          subject: subject || '(no subject)',
          from_email: fromEmail,
          from_name: fromName,
          to_emails: toRaw,
          cc_emails: ccRaw,
          snippet: lastMsg.snippet || '',
          last_message_at: new Date(parseInt(lastMsg.internalDate)).toISOString(),
          message_count: messages.length,
          is_unread: isUnread,
          labels: allLabels,
          client_id: clientId,
          last_message_from: lastFromEmail,
          synced_at: new Date().toISOString()
        };
        if (ruleEndClient) row.end_client = ruleEndClient;
        if (ruleCampaignId) row.campaign_id = ruleCampaignId;
        if (ruleOpportunityId) row.opportunity_id = ruleOpportunityId;

        const { data: existing } = await client
          .from('gmail_threads')
          .select('id')
          .eq('user_id', userId)
          .eq('thread_id', thread.id)
          .single();

        if (existing) {
          await client.from('gmail_threads').update(row).eq('id', existing.id);
          stats.updated++;
        } else {
          await client.from('gmail_threads').insert(row);
          stats.inserted++;
        }
      } catch (threadErr) {
        stats.skipped++;
      }
    }

    await updateSyncStatus(userId, 'gmail', 'ok',
      stats.inserted + ' new, ' + stats.updated + ' updated' + (stats.skipped ? ', ' + stats.skipped + ' skipped' : ''));
    return stats;
  } catch (e) {
    stats.error = e.message;
    await updateSyncStatus(userId, 'gmail', 'error', e.message);
    throw e;
  }
}

module.exports = { syncGmail };
