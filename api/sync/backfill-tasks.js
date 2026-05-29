const { verifyUserToken, cors, getServiceClient, getCredentials } = require('../_lib/supabase');
const { analyzeMeetingForTasks } = require('../_lib/analyze-meeting');
const { analyzeEmailsForTasks } = require('../_lib/analyze-emails');
const { refreshGmailToken } = require('../_lib/gmail-auth');

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  function emit(obj) { res.write(JSON.stringify(obj) + '\n'); }
  function log(msg) { console.log('[backfill-tasks] ' + msg); emit({ type: 'log', message: msg }); }

  var stats = { meetings_processed: 0, meeting_tasks: 0, emails_processed: 0, email_tasks: 0, skipped: 0 };

  try {
    var client = getServiceClient();
    var fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();

    // ── Phase 1: Meetings ──
    log('Finding unprocessed meetings from last 14 days...');
    var meetingsRes = await client
      .from('meetings')
      .select('id, session_id, title, start_time, end_time, summary, transcript, action_items, participants, owner_name, owner_email, client_id, end_client, campaign_id, opportunity_id, ai_tasks_generated')
      .eq('user_id', userId)
      .gte('start_time', fourteenDaysAgo)
      .or('ai_tasks_generated.is.null,ai_tasks_generated.eq.false')
      .order('start_time', { ascending: false });

    var meetings = meetingsRes.data || [];
    log('Found ' + meetings.length + ' unprocessed meetings');

    for (var mi = 0; mi < meetings.length; mi++) {
      var m = meetings[mi];
      try {
        if (!m.transcript && !m.summary) {
          log('Skipping "' + (m.title || '').substring(0, 50) + '" (no transcript/summary)');
          stats.skipped++;
          continue;
        }

        log('[Meeting ' + (mi + 1) + '/' + meetings.length + '] ' + (m.title || '').substring(0, 50));

        var tasksGenerated = await analyzeMeetingForTasks(userId, {
          id: m.id,
          owner_name: m.owner_name || '',
          owner_email: m.owner_email || '',
          title: m.title || '',
          start_time: m.start_time,
          summary: m.summary || '',
          transcript: m.transcript || '',
          action_items: m.action_items || [],
          participants: m.participants || [],
          client_id: m.client_id,
          end_client: m.end_client || '',
          campaign_id: m.campaign_id,
          opportunity_id: m.opportunity_id
        }, client);

        stats.meetings_processed++;
        stats.meeting_tasks += tasksGenerated;
        log('  → ' + tasksGenerated + ' task(s)');
        await sleep(500);
      } catch (meetErr) {
        log('  Error: ' + meetErr.message);
        stats.skipped++;
      }
    }

    // ── Phase 2: Emails ──
    log('Finding unprocessed email threads from last 14 days...');
    var threadsRes = await client
      .from('gmail_threads')
      .select('thread_id, subject, from_email, from_name, snippet, last_message_at, last_message_from, client_id, campaign_id')
      .eq('user_id', userId)
      .gte('last_message_at', fourteenDaysAgo)
      .or('ai_tasks_generated.is.null,ai_tasks_generated.eq.false')
      .order('last_message_at', { ascending: false });

    var threads = threadsRes.data || [];
    log('Found ' + threads.length + ' unprocessed email threads');

    if (threads.length > 0) {
      // Fetch Gmail access token for body retrieval
      var gmailCred = await getCredentials(userId, 'gmail');
      if (!gmailCred) {
        log('Gmail not connected, skipping email analysis');
      } else {
        var accessToken = await refreshGmailToken(gmailCred);

        // Fetch bodies and build thread objects for the analyzer
        var threadBatch = [];
        for (var ti = 0; ti < threads.length; ti++) {
          var t = threads[ti];
          try {
            log('[Email ' + (ti + 1) + '/' + threads.length + '] ' + (t.subject || '').substring(0, 50));

            // Fetch full thread body from Gmail
            var fullResp = await fetch(
              GMAIL_API + '/threads/' + t.thread_id + '?format=full',
              { headers: { 'Authorization': 'Bearer ' + accessToken } }
            );

            if (fullResp.status === 401) {
              gmailCred = await getCredentials(userId, 'gmail');
              if (gmailCred) accessToken = await refreshGmailToken(gmailCred);
              fullResp = await fetch(
                GMAIL_API + '/threads/' + t.thread_id + '?format=full',
                { headers: { 'Authorization': 'Bearer ' + accessToken } }
              );
            }

            if (!fullResp.ok) {
              log('  Failed to fetch body (HTTP ' + fullResp.status + ')');
              continue;
            }

            var fullData = await fullResp.json();
            var messages = fullData.messages || [];
            var bodyParts = [];
            for (var mi2 = 0; mi2 < messages.length; mi2++) {
              var body = extractTextBody(messages[mi2].payload);
              if (body && body.trim().length > 10) bodyParts.push(body);
            }

            threadBatch.push({
              thread_id: t.thread_id,
              subject: t.subject || '',
              from_email: t.from_email || '',
              from_name: t.from_name || '',
              snippet: t.snippet || '',
              last_message_at: t.last_message_at || '',
              last_message_from: t.last_message_from || '',
              client_id: t.client_id || null,
              body: bodyParts.join('\n\n---\n\n')
            });

            await sleep(200);
          } catch (fetchErr) {
            log('  Error fetching: ' + fetchErr.message);
          }
        }

        if (threadBatch.length > 0) {
          log('Analyzing ' + threadBatch.length + ' email threads with AI...');
          var emailTasks = await analyzeEmailsForTasks(userId, threadBatch, client, log);
          stats.emails_processed = threadBatch.length;
          stats.email_tasks = emailTasks;
        }
      }
    }

    log('Done! Meetings: ' + stats.meetings_processed + ' processed (' + stats.meeting_tasks + ' tasks). Emails: ' + stats.emails_processed + ' processed (' + stats.email_tasks + ' tasks). Skipped: ' + stats.skipped);
    emit({ type: 'done', success: true, ...stats });
    res.end();
  } catch (e) {
    log('Error: ' + e.message);
    emit({ type: 'done', success: false, error: e.message, ...stats });
    res.end();
  }
};

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
