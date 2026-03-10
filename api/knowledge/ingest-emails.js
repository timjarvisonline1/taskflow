/**
 * POST /api/knowledge/ingest-emails
 * ====================================
 * Fetches email bodies from Gmail and embeds into knowledge base.
 *
 * Body: {
 *   threadIds: [string, ...],    // optional, specific threads to embed
 *   batchSize: 15,               // optional, default 15
 *   afterDate: "ISO string",     // optional, only threads after this date
 *   clientOnly: boolean          // optional, only client-matched threads
 * }
 *
 * Returns: { processed, chunks, tokens, remaining }
 */

const { getServiceClient, verifyUserToken, cors, getCredentials } = require('../_lib/supabase');
const { getOpenAIKey, embedTexts, chunkEmailThread, storeChunks, upsertSource } = require('../_lib/embeddings');
const { refreshGmailToken } = require('../_lib/gmail-auth');

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';
const DEFAULT_BATCH = 15;

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  var userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    var openaiKey = await getOpenAIKey(userId);
    if (!openaiKey) return res.status(400).json({ error: 'OpenAI API key not configured' });

    var gmailCred = await getCredentials(userId, 'gmail');
    if (!gmailCred) return res.status(400).json({ error: 'Gmail not connected' });
    var accessToken = await refreshGmailToken(gmailCred);

    var client = getServiceClient();
    var body = req.body || {};
    var batchSize = Math.min(body.batchSize || DEFAULT_BATCH, 25);
    var threads = [];

    if (body.threadIds && body.threadIds.length > 0) {
      // Specific threads
      var tRes = await client.from('gmail_threads')
        .select('thread_id, subject, from_email, from_name, client_id, end_client, campaign_id, last_message_at')
        .eq('user_id', userId)
        .in('thread_id', body.threadIds.slice(0, batchSize));
      threads = tRes.data || [];
    } else {
      // Find un-embedded threads
      var query = client.from('gmail_threads')
        .select('thread_id, subject, from_email, from_name, client_id, end_client, campaign_id, last_message_at')
        .eq('user_id', userId)
        .order('last_message_at', { ascending: false });

      if (body.afterDate) {
        query = query.gte('last_message_at', body.afterDate);
      }
      if (body.clientOnly) {
        query = query.not('client_id', 'is', null);
      }

      var allRes = await query.limit(200);
      var allThreads = allRes.data || [];

      // Check existing embeddings + last ingested timestamp (L17 — re-embed on new messages)
      var existingRes = await client.from('knowledge_sources')
        .select('source_id, updated_at')
        .eq('user_id', userId)
        .eq('source_type', 'email');

      var embeddedMap = {};
      (existingRes.data || []).forEach(function(r) { embeddedMap[r.source_id] = r.updated_at || ''; });

      threads = allThreads.filter(function(t) {
        var lastIngested = embeddedMap[t.thread_id];
        if (!lastIngested) return true; // never embedded
        // Re-embed if thread has newer messages than last ingestion
        if (t.last_message_at && new Date(t.last_message_at) > new Date(lastIngested)) return true;
        return false;
      }).slice(0, batchSize);
    }

    if (threads.length === 0) {
      return res.status(200).json({ processed: 0, chunks: 0, tokens: 0, remaining: 0 });
    }

    // Fetch full bodies from Gmail and chunk
    var allChunks = [];
    var processed = 0;

    for (var i = 0; i < threads.length; i++) {
      var thread = threads[i];
      try {
        // Fetch full thread from Gmail
        var threadResp = await fetch(
          GMAIL_API + '/threads/' + thread.thread_id + '?format=full',
          { headers: { 'Authorization': 'Bearer ' + accessToken } }
        );

        if (!threadResp.ok) {
          console.error('Gmail fetch error for ' + thread.thread_id + ': ' + threadResp.status);
          continue;
        }

        var threadData = await threadResp.json();
        var messages = (threadData.messages || []).map(function(msg) {
          var getHeader = function(name) {
            var h = (msg.payload && msg.payload.headers || []).find(function(hdr) {
              return hdr.name.toLowerCase() === name.toLowerCase();
            });
            return h ? h.value : '';
          };

          var txtBody = extractTextBody(msg.payload);
          var fromRaw = getHeader('From');
          var fromMatch = fromRaw.match(/^(.+?)\s*<(.+?)>$/);

          return {
            from: fromRaw,
            fromName: fromMatch ? fromMatch[1].replace(/"/g, '').trim() : fromRaw.trim(),
            date: new Date(parseInt(msg.internalDate)).toISOString(),
            body: txtBody,
            subject: getHeader('Subject')
          };
        }).filter(function(m) { return m.body.trim().length > 0; });

        if (messages.length === 0) continue;

        var chunks = chunkEmailThread(
          thread.thread_id,
          thread.subject || messages[0].subject || '',
          messages,
          { client_id: thread.client_id, end_client: thread.end_client || '', campaign_id: thread.campaign_id }
        );

        chunks.forEach(function(c) {
          c._threadId = thread.thread_id;
          c._subject = thread.subject || '';
          allChunks.push(c);
        });

        processed++;
      } catch (fetchErr) {
        console.error('Error processing thread ' + thread.thread_id + ':', fetchErr.message);
      }
    }

    if (allChunks.length === 0) {
      return res.status(200).json({ processed: processed, chunks: 0, tokens: 0, remaining: 0 });
    }

    // Embed all chunks
    var texts = allChunks.map(function(c) { return c.content; });
    var embeddings = await embedTexts(openaiKey, texts);

    var totalTokens = 0;
    for (var j = 0; j < allChunks.length; j++) {
      allChunks[j].embedding = embeddings[j].embedding;
      allChunks[j].tokens = embeddings[j].tokens;
      totalTokens += embeddings[j].tokens;
    }

    // Group by thread and store
    var threadChunksMap = {};
    allChunks.forEach(function(c) {
      if (!threadChunksMap[c._threadId]) threadChunksMap[c._threadId] = [];
      threadChunksMap[c._threadId].push(c);
    });

    var totalStored = 0;
    var threadKeys = Object.keys(threadChunksMap);
    for (var k = 0; k < threadKeys.length; k++) {
      var tId = threadKeys[k];
      var tChunks = threadChunksMap[tId];
      var result = await storeChunks(client, userId, 'email', tId, tChunks);
      totalStored += result.inserted + result.updated;

      var tTokens = tChunks.reduce(function(s, c) { return s + (c.tokens || 0); }, 0);
      await upsertSource(client, userId, 'email', tId, tChunks[0]._subject, 'complete', tChunks.length, tTokens, '');
    }

    return res.status(200).json({
      processed: processed,
      chunks: totalStored,
      tokens: totalTokens,
      remaining: -1  // Unknown without full count query
    });

  } catch (e) {
    console.error('ingest-emails error:', e);
    return res.status(500).json({ error: e.message });
  }
};


/* ═══════════ Body extraction (same pattern as api/gmail/summarize.js) ═══════════ */

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
  // Fallback: strip HTML
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
