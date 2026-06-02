const { getServiceClient, getCredentials } = require('../_lib/supabase');
const { analyzeEmailsForTasks } = require('../_lib/analyze-emails');
const { refreshGmailToken } = require('../_lib/gmail-auth');

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';
const USER_ID = '78bd1255-f05a-436b-abbd-f8c281d30210';

/**
 * GET /api/cron/email-tasks
 * Vercel cron job: lightweight Gmail sync (last 50 threads only) + AI task extraction.
 * The full syncGmail() blows the memory limit; this does a targeted check instead.
 * Protected by CRON_SECRET header (Vercel injects this for cron jobs).
 */
module.exports = async function handler(req, res) {
  if (req.headers.authorization !== 'Bearer ' + process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  var log = [];
  function l(msg) { log.push(msg); console.log('[cron/email-tasks] ' + msg); }

  try {
    var client = getServiceClient();

    // Phase 1: Lightweight Gmail sync — fetch only the 50 most recent threads
    l('Syncing recent Gmail threads...');
    var gmailCred = await getCredentials(USER_ID, 'gmail');
    if (!gmailCred) {
      l('Gmail not connected');
      return res.status(200).json({ success: true, log: log, tasks: 0 });
    }
    var accessToken = await refreshGmailToken(gmailCred);

    var listResp = await fetch(GMAIL_API + '/threads?maxResults=50', {
      headers: { 'Authorization': 'Bearer ' + accessToken }
    });
    if (!listResp.ok) { l('Gmail list failed: HTTP ' + listResp.status); return res.status(200).json({ success: false, log: log }); }
    var listData = await listResp.json();
    var threadIds = (listData.threads || []).map(function(t) { return t.id; });

    // Check which are new (not in gmail_threads table yet)
    var existingRes = await client.from('gmail_threads').select('thread_id').eq('user_id', USER_ID).in('thread_id', threadIds);
    var existingSet = {};
    (existingRes.data || []).forEach(function(r) { existingSet[r.thread_id] = true; });
    var newThreadIds = threadIds.filter(function(id) { return !existingSet[id]; });

    var syncInserted = 0;
    for (var ni = 0; ni < newThreadIds.length; ni++) {
      try {
        var tResp = await fetch(GMAIL_API + '/threads/' + newThreadIds[ni] + '?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Cc', {
          headers: { 'Authorization': 'Bearer ' + accessToken }
        });
        if (!tResp.ok) continue;
        var tData = await tResp.json();
        var msgs = tData.messages || [];
        if (!msgs.length) continue;

        var firstMsg = msgs[0], lastMsg = msgs[msgs.length - 1];
        var getH = function(msg, name) {
          var h = (msg.payload && msg.payload.headers || []).find(function(hdr) { return hdr.name.toLowerCase() === name.toLowerCase(); });
          return h ? h.value : '';
        };
        var fromRaw = getH(firstMsg, 'From');
        var fromMatch = fromRaw.match(/^(.+?)\s*<(.+?)>$/);
        var fromName = fromMatch ? fromMatch[1].replace(/"/g, '').trim() : '';
        var fromEmail = fromMatch ? fromMatch[2].trim() : fromRaw.trim();
        var subject = getH(firstMsg, 'Subject');
        var lastFromRaw = getH(lastMsg, 'From');
        var lastFromMatch = lastFromRaw.match(/<(.+?)>/);
        var lastFromEmail = lastFromMatch ? lastFromMatch[1].trim() : lastFromRaw.trim();

        var row = {
          user_id: USER_ID, thread_id: newThreadIds[ni],
          subject: subject || '(no subject)', from_email: fromEmail, from_name: fromName,
          to_emails: getH(firstMsg, 'To'), cc_emails: getH(firstMsg, 'Cc') || '',
          snippet: lastMsg.snippet || '',
          last_message_at: new Date(parseInt(lastMsg.internalDate)).toISOString(),
          message_count: msgs.length, is_unread: (lastMsg.labelIds || []).indexOf('UNREAD') !== -1,
          labels: msgs.flatMap(function(m) { return m.labelIds || []; }).filter(function(v, i, a) { return a.indexOf(v) === i; }).join(','),
          last_message_from: lastFromEmail,
          synced_at: new Date().toISOString()
        };
        await client.from('gmail_threads').insert(row);
        syncInserted++;
      } catch (e) { /* skip individual thread errors */ }
    }
    l('Gmail: ' + syncInserted + ' new threads synced (checked ' + threadIds.length + ')');

    // Phase 2: Find unanalyzed threads from last 3 days (covers weekend gaps)
    var threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    var threadsRes = await client.from('gmail_threads')
      .select('thread_id, subject, from_email, from_name, snippet, last_message_at, last_message_from, client_id')
      .eq('user_id', USER_ID)
      .gte('last_message_at', threeDaysAgo)
      .or('ai_tasks_generated.is.null,ai_tasks_generated.eq.false')
      .order('last_message_at', { ascending: false });

    var allThreads = threadsRes.data || [];
    if (!allThreads.length) {
      l('No unanalyzed threads');
      return res.status(200).json({ success: true, log: log, sync: syncStats, tasks: 0 });
    }

    // Get user email for reply detection
    var userEmail = '';
    try {
      var userData = await client.auth.admin.getUserById(USER_ID);
      if (userData.data && userData.data.user && userData.data.user.email) userEmail = userData.data.user.email.toLowerCase();
    } catch (e) { /* ignore */ }

    // Pre-filter automated emails
    var threads = allThreads.filter(function(t) {
      var from = (t.from_email || '').toLowerCase();
      var subj = t.subject || '';
      if (userEmail && t.last_message_from && t.last_message_from.toLowerCase() === userEmail) return false;
      if (/noreply@|no-reply@|notifications@|mailer-daemon@|daemon@|@calendar\.google|@facebookmail|@e\.linkedin|@accounts\.google|@.*\.gserviceaccount/i.test(from)) return false;
      if (/^(re:\s*)?(accepted|declined|tentative|cancelled|updated):/i.test(subj)) return false;
      if (/delivery status notification|out of office|automatic reply|unsubscribe/i.test(subj)) return false;
      if (/your (receipt|invoice|payment|subscription|order)|pre-read for your upcoming|has joined your meeting|daily summary \| conversation|weekly (digest|usage|summary)|held tasks are still waiting|your audience .* is now ready|annual report due|made a transfer from|new sign-in|security alert|verification code|confirm your email|payment.*unsuccessful|limit reached|failed production deployment/i.test(subj)) return false;
      return true;
    });

    // Mark skipped threads
    var skippedIds = allThreads.filter(function(t) { return threads.indexOf(t) === -1; }).map(function(t) { return t.thread_id; });
    if (skippedIds.length) {
      for (var i = 0; i < skippedIds.length; i += 50) {
        await client.from('gmail_threads').update({ ai_tasks_generated: true }).eq('user_id', USER_ID).in('thread_id', skippedIds.slice(i, i + 50));
      }
    }

    l(allThreads.length + ' unanalyzed threads, ' + threads.length + ' actionable after pre-filter');

    if (!threads.length) {
      return res.status(200).json({ success: true, log: log, sync: syncStats, tasks: 0 });
    }

    // Phase 3: Fetch bodies and analyze
    var gmailCred = await getCredentials(USER_ID, 'gmail');
    if (!gmailCred) {
      l('Gmail not connected');
      return res.status(200).json({ success: true, log: log, sync: syncStats, tasks: 0, error: 'Gmail not connected' });
    }
    var accessToken = await refreshGmailToken(gmailCred);

    var threadBatch = [];
    for (var ti = 0; ti < threads.length; ti++) {
      var t = threads[ti];
      try {
        var fullResp = await fetch(GMAIL_API + '/threads/' + t.thread_id + '?format=full', {
          headers: { 'Authorization': 'Bearer ' + accessToken }
        });
        if (fullResp.status === 401) {
          gmailCred = await getCredentials(USER_ID, 'gmail');
          if (gmailCred) accessToken = await refreshGmailToken(gmailCred);
          fullResp = await fetch(GMAIL_API + '/threads/' + t.thread_id + '?format=full', {
            headers: { 'Authorization': 'Bearer ' + accessToken }
          });
        }
        if (!fullResp.ok) continue;

        var fullData = await fullResp.json();
        var bodyParts = (fullData.messages || []).map(function(msg) { return extractTextBody(msg.payload); }).filter(function(b) { return b && b.trim().length > 10; });

        threadBatch.push({
          thread_id: t.thread_id, subject: t.subject || '',
          from_email: t.from_email || '', from_name: t.from_name || '',
          snippet: t.snippet || '', last_message_at: t.last_message_at || '',
          last_message_from: t.last_message_from || '', client_id: t.client_id || null,
          body: bodyParts.join('\n\n---\n\n')
        });
      } catch (e) { l('Body fetch error: ' + e.message); }
    }

    var totalTasks = 0;
    if (threadBatch.length) {
      l('Analyzing ' + threadBatch.length + ' emails...');
      totalTasks = await analyzeEmailsForTasks(USER_ID, threadBatch, client, l);
    }

    l('Done: ' + totalTasks + ' tasks from ' + threadBatch.length + ' emails');
    return res.status(200).json({ success: true, log: log, sync: syncStats, tasks: totalTasks });
  } catch (e) {
    l('Error: ' + e.message);
    return res.status(200).json({ success: false, log: log, error: e.message });
  }
};

function extractTextBody(payload) {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body && payload.body.data)
    return Buffer.from(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
  var parts = payload.parts || [];
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].mimeType === 'text/plain' && parts[i].body && parts[i].body.data)
      return Buffer.from(parts[i].body.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
    if (parts[i].parts) { var n = extractTextBody(parts[i]); if (n) return n; }
  }
  for (var j = 0; j < parts.length; j++) {
    if (parts[j].mimeType === 'text/html' && parts[j].body && parts[j].body.data)
      return Buffer.from(parts[j].body.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  return '';
}
