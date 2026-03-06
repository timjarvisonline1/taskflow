const { getServiceClient, getCredentials, updateSyncStatus } = require('./supabase');
const { refreshGmailToken } = require('./gmail-auth');
const { getOpenAIKey, embedTexts, chunkEmailThread, storeChunks, upsertSource } = require('./embeddings');

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

/**
 * Sync Gmail thread metadata to Supabase.
 * Paginates through Gmail threads until it reaches ones already synced,
 * so no emails are missed even after long gaps.
 */
async function syncGmail(userId) {
  const credRow = await getCredentials(userId, 'gmail');
  if (!credRow) throw new Error('Gmail not connected');

  const stats = { fetched: 0, inserted: 0, updated: 0, skipped: 0, embedded: 0, error: null };
  const newThreads = []; // Track newly inserted threads for embedding

  try {
    const accessToken = await refreshGmailToken(credRow);
    const client = getServiceClient();

    // Load existing thread IDs so we know when to stop paginating
    const { data: existingRows } = await client
      .from('gmail_threads')
      .select('thread_id, last_message_at')
      .eq('user_id', userId);
    const existingMap = {};
    (existingRows || []).forEach(function(r) {
      existingMap[r.thread_id] = r.last_message_at;
    });

    // Paginate through Gmail thread list until we've caught up
    let pageToken = null;
    let allThreadIds = [];
    const MAX_PAGES = 5; // Safety limit: 5 pages × 100 = 500 threads max
    for (let page = 0; page < MAX_PAGES; page++) {
      let url = GMAIL_API + '/threads?maxResults=100';
      if (pageToken) url += '&pageToken=' + pageToken;

      const listResp = await fetch(url, {
        headers: { 'Authorization': 'Bearer ' + accessToken }
      });
      if (!listResp.ok) throw new Error('Gmail API returned ' + listResp.status);
      const listData = await listResp.json();
      const pageThreads = listData.threads || [];

      allThreadIds = allThreadIds.concat(pageThreads);
      stats.fetched += pageThreads.length;

      // Check if all threads on this page are already known
      let allKnown = pageThreads.length > 0;
      for (const t of pageThreads) {
        if (!existingMap[t.id]) { allKnown = false; break; }
      }

      pageToken = listData.nextPageToken;
      // Stop if we've caught up (all threads known) or no more pages
      if (allKnown || !pageToken) break;
    }

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
    // Skip detailed metadata fetch for threads that haven't changed
    for (const thread of allThreadIds) {
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
          .select('id, needs_reply, reply_status, last_message_from')
          .eq('user_id', userId)
          .eq('thread_id', thread.id)
          .single();

        if (existing) {
          // Auto-detect replies: if last_message_from changed to user's email
          // and thread previously needed a reply, clear it
          if (existing.needs_reply === true &&
              lastFromEmail && userEmails.indexOf(lastFromEmail.toLowerCase()) !== -1) {
            row.needs_reply = false;
            row.reply_status = 'pending';
          }
          // If last_message_from changed to external sender on a thread that
          // was previously analyzed as not needing reply, reset for re-analysis
          if (existing.needs_reply === false &&
              existing.last_message_from &&
              userEmails.indexOf(existing.last_message_from.toLowerCase()) !== -1 &&
              lastFromEmail && userEmails.indexOf(lastFromEmail.toLowerCase()) === -1) {
            row.needs_reply = null; // triggers re-analysis
          }
          await client.from('gmail_threads').update(row).eq('id', existing.id);
          stats.updated++;
        } else {
          await client.from('gmail_threads').insert(row);
          stats.inserted++;
          newThreads.push({ thread_id: thread.id, subject: subject, client_id: clientId, end_client: ruleEndClient || '', campaign_id: ruleCampaignId || null });
        }
      } catch (threadErr) {
        stats.skipped++;
      }
    }

    // Auto-embed newly inserted threads into knowledge base (best-effort)
    // Process ALL new threads — no limit. If timeout interrupts, the frontend
    // safety-net call to /api/knowledge/ingest-emails will catch stragglers.
    if (newThreads.length > 0) {
      try {
        var openaiKey = await getOpenAIKey(userId);
        if (openaiKey) {
          for (var ti = 0; ti < newThreads.length; ti++) {
            try {
              var t = newThreads[ti];
              // Fetch full thread body from Gmail
              var fullResp = await fetch(
                GMAIL_API + '/threads/' + t.thread_id + '?format=full',
                { headers: { 'Authorization': 'Bearer ' + accessToken } }
              );
              if (!fullResp.ok) continue;
              var fullData = await fullResp.json();

              var emailMessages = (fullData.messages || []).map(function(msg) {
                var getH = function(name) {
                  var h = (msg.payload && msg.payload.headers || []).find(function(hdr) {
                    return hdr.name.toLowerCase() === name.toLowerCase();
                  });
                  return h ? h.value : '';
                };
                var body = extractTextBody(msg.payload);
                if (!body || body.trim().length < 10) return null;
                var fr = getH('From');
                var fm = fr.match(/^(.+?)\s*<(.+?)>$/);
                return {
                  from: fr,
                  fromName: fm ? fm[1].replace(/"/g, '').trim() : fr.trim(),
                  date: new Date(parseInt(msg.internalDate)).toISOString(),
                  body: body,
                  subject: getH('Subject')
                };
              }).filter(function(m) { return m !== null; });

              if (emailMessages.length === 0) continue;

              var chunks = chunkEmailThread(
                t.thread_id,
                t.subject || emailMessages[0].subject || '',
                emailMessages,
                { client_id: t.client_id, end_client: t.end_client || '', campaign_id: t.campaign_id }
              );
              if (chunks.length === 0) continue;

              var texts = chunks.map(function(c) { return c.content; });
              var embeddings = await embedTexts(openaiKey, texts);
              for (var ei = 0; ei < chunks.length; ei++) {
                chunks[ei].embedding = embeddings[ei].embedding;
                chunks[ei].tokens = embeddings[ei].tokens;
              }
              await storeChunks(client, userId, 'email', t.thread_id, chunks);
              var tokUsed = chunks.reduce(function(s, c) { return s + (c.tokens || 0); }, 0);
              await upsertSource(client, userId, 'email', t.thread_id, t.subject || '', 'complete', chunks.length, tokUsed, '');
              stats.embedded++;
            } catch (singleErr) {
              // Skip this thread, continue with others
            }
          }
        }
      } catch (embedErr) {
        console.error('Gmail embedding error (non-fatal):', embedErr.message);
      }
    }

    await updateSyncStatus(userId, 'gmail', 'ok',
      stats.inserted + ' new, ' + stats.updated + ' updated' + (stats.skipped ? ', ' + stats.skipped + ' skipped' : '') + (stats.embedded ? ', ' + stats.embedded + ' embedded' : ''));
    return stats;
  } catch (e) {
    stats.error = e.message;
    await updateSyncStatus(userId, 'gmail', 'error', e.message);
    throw e;
  }
}

/* ═══════════ Text body extraction for embedding ═══════════ */
function extractTextBody(payload) {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body && payload.body.data) {
    return decodeBase64Url(payload.body.data);
  }
  var parts = payload.parts || [];
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].mimeType === 'text/plain' && parts[i].body && parts[i].body.data) {
      return decodeBase64Url(parts[i].body.data);
    }
    if (parts[i].parts) {
      var nested = extractTextBody(parts[i]);
      if (nested) return nested;
    }
  }
  for (var j = 0; j < parts.length; j++) {
    if (parts[j].mimeType === 'text/html' && parts[j].body && parts[j].body.data) {
      return decodeBase64Url(parts[j].body.data).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
  }
  return '';
}

function decodeBase64Url(data) {
  var base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

module.exports = { syncGmail };
