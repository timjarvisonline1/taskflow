/**
 * POST /api/cron/batch-draft
 * ===========================
 * Batch generates AI draft replies for emails flagged as needing a response.
 * Auth: CRON_SECRET Bearer token (same pattern as sync endpoints).
 *
 * Steps:
 * 1. Get Gmail-connected user from integration_credentials
 * 2. Embed un-embedded recent INBOX threads (up to 25) to keep KB fresh
 * 3. Query gmail_threads for candidates needing reply
 * 4. For each candidate: fetch thread, run RAG pipeline, insert draft
 * 5. Return summary
 */

const { getServiceClient, getCredentials } = require('../_lib/supabase');
const { refreshGmailToken } = require('../_lib/gmail-auth');
const { getOpenAIKey, embedTexts, chunkEmailThread, storeChunks, upsertSource, stripQuotedReply } = require('../_lib/embeddings');
const { generateDraft } = require('../_lib/draft-engine');

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

module.exports = async function handler(req, res) {
  /* CORS */
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  /* Auth: CRON_SECRET or Supabase JWT (for trigger-batch-draft wrapper) */
  var authHeader = req.headers.authorization || '';
  var isCron = false;
  var userId = null;

  if (authHeader.startsWith('Bearer ')) {
    var token = authHeader.slice(7);
    if (token === process.env.CRON_SECRET) {
      isCron = true;
    } else {
      /* Try Supabase JWT auth */
      var client = getServiceClient();
      var userResult = await client.auth.getUser(token);
      if (userResult.data && userResult.data.user) {
        userId = userResult.data.user.id;
      }
    }
  }

  if (!isCron && !userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    var client = getServiceClient();
    var batchRunId = 'batch_' + Date.now();
    var summary = {
      success: true,
      batch_run_id: batchRunId,
      threads_checked: 0,
      drafts_created: 0,
      threads_skipped: 0,
      skip_reasons: {},
      emails_embedded: 0,
      drafts: []
    };

    /* Step 1: Get Gmail-connected user */
    if (isCron) {
      var credRes = await client.from('integration_credentials')
        .select('user_id')
        .eq('platform', 'gmail')
        .eq('is_active', true)
        .limit(1)
        .single();
      if (!credRes.data) return res.status(200).json({ success: false, error: 'No Gmail-connected user found' });
      userId = credRes.data.user_id;
    }

    var gmailCred = await getCredentials(userId, 'gmail');
    if (!gmailCred) return res.status(200).json({ success: false, error: 'Gmail not connected' });
    var accessToken = await refreshGmailToken(gmailCred);

    /* Get user's email address */
    var profileResp = await fetch(GMAIL_API + '/profile', {
      headers: { 'Authorization': 'Bearer ' + accessToken }
    });
    var profile = await profileResp.json();
    var userEmail = (profile.emailAddress || '').toLowerCase();

    /* Step 2: Embed un-embedded recent INBOX threads */
    try {
      var embeddedCount = await embedRecentThreads(client, userId, accessToken);
      summary.emails_embedded = embeddedCount;
    } catch (embedErr) {
      console.error('Embedding step error (non-fatal):', embedErr.message);
    }

    /* Step 3: Query for candidates */
    var candidateRes = await client.from('gmail_threads')
      .select('thread_id, subject, from_email, from_name, client_id, end_client, campaign_id, opportunity_id, ai_urgency, last_message_from, last_message_at, ai_summary, reply_status')
      .eq('user_id', userId)
      .eq('needs_reply', true)
      .ilike('labels', '%INBOX%')
      .order('last_message_at', { ascending: false })
      .limit(50);
    console.log('[batch-draft] Candidates query returned:', (candidateRes.data || []).length, 'rows, error:', candidateRes.error ? candidateRes.error.message : 'none');

    var allCandidates = candidateRes.data || [];

    /* Filter: reply_status must be null or 'pending' */
    var filtered = allCandidates.filter(function(t) {
      var rs = t.reply_status;
      if (rs && rs !== 'pending') return false;
      /* Last message must not be from the user */
      if (t.last_message_from && t.last_message_from.toLowerCase() === userEmail) return false;
      return true;
    });

    /* Exclude threads that already have pending/edited drafts */
    var existingDraftsRes = await client.from('ai_email_drafts')
      .select('thread_id')
      .eq('user_id', userId)
      .in('status', ['pending', 'edited']);
    var existingDraftThreads = {};
    (existingDraftsRes.data || []).forEach(function(d) { existingDraftThreads[d.thread_id] = true; });

    var candidates = filtered.filter(function(t) {
      return !existingDraftThreads[t.thread_id];
    });
    console.log('[batch-draft] After filters: allCandidates=' + allCandidates.length + ', afterReplyStatus=' + filtered.length + ', afterExistingDrafts=' + candidates.length);

    /* Sort by urgency priority */
    var urgencyOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    candidates.sort(function(a, b) {
      var ua = urgencyOrder[a.ai_urgency] !== undefined ? urgencyOrder[a.ai_urgency] : 2;
      var ub = urgencyOrder[b.ai_urgency] !== undefined ? urgencyOrder[b.ai_urgency] : 2;
      if (ua !== ub) return ua - ub;
      return new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0);
    });

    candidates = candidates.slice(0, 15);
    summary.threads_checked = allCandidates.length;
    summary.threads_skipped = allCandidates.length - candidates.length;

    /* Step 4: Process each candidate */
    for (var i = 0; i < candidates.length; i++) {
      var thread = candidates[i];
      try {
        /* Fetch full thread from Gmail */
        var threadResp = await fetch(
          GMAIL_API + '/threads/' + thread.thread_id + '?format=full',
          { headers: { 'Authorization': 'Bearer ' + accessToken } }
        );
        if (!threadResp.ok) {
          addSkipReason(summary, 'gmail_fetch_error');
          continue;
        }
        var threadData = await threadResp.json();
        var gmailMessages = threadData.messages || [];
        if (!gmailMessages.length) {
          addSkipReason(summary, 'no_messages');
          continue;
        }

        /* Parse messages */
        var parsedMessages = gmailMessages.map(function(msg) {
          var getHeader = function(name) {
            var h = (msg.payload && msg.payload.headers || []).find(function(hdr) {
              return hdr.name.toLowerCase() === name.toLowerCase();
            });
            return h ? h.value : '';
          };
          return {
            id: msg.id,
            from: getHeader('From'),
            fromName: extractName(getHeader('From')),
            fromEmail: extractEmail(getHeader('From')),
            to: getHeader('To'),
            cc: getHeader('Cc'),
            subject: getHeader('Subject'),
            date: new Date(parseInt(msg.internalDate)).toISOString(),
            body: extractBody(msg.payload),
            labels: msg.labelIds || []
          };
        });

        /* Find latest inbound message (not from user) */
        var latestInbound = null;
        for (var mi = parsedMessages.length - 1; mi >= 0; mi--) {
          if (parsedMessages[mi].fromEmail.toLowerCase() !== userEmail) {
            latestInbound = parsedMessages[mi];
            break;
          }
        }
        if (!latestInbound) {
          addSkipReason(summary, 'no_inbound_message');
          continue;
        }

        /* Build CRM context from thread data */
        var crmContext = null;
        if (thread.client_id || thread.campaign_id || thread.opportunity_id) {
          crmContext = {};
          if (thread.client_id) {
            var clRes = await client.from('clients').select('name').eq('id', thread.client_id).single();
            if (clRes.data) crmContext.clientName = clRes.data.name;
          }
          if (thread.end_client) crmContext.endClientName = thread.end_client;
          if (thread.campaign_id) {
            var cpRes = await client.from('campaigns').select('name,status').eq('id', thread.campaign_id).single();
            if (cpRes.data) { crmContext.campaignName = cpRes.data.name; crmContext.campaignStatus = cpRes.data.status; }
          }
          if (thread.opportunity_id) {
            var opRes = await client.from('opportunities').select('name,stage').eq('id', thread.opportunity_id).single();
            if (opRes.data) { crmContext.opportunityName = opRes.data.name; crmContext.opportunityStage = opRes.data.stage; }
          }
        }

        /* Run RAG pipeline (shared helper) */
        var result = await generateDraft({
          userId: userId,
          client: client,
          messages: parsedMessages.map(function(m) {
            return { from: m.from, fromName: m.fromName, date: m.date, body: m.body };
          }),
          subject: thread.subject || latestInbound.subject || '',
          clientId: thread.client_id,
          crmContext: crmContext,
          isBatchDraft: true
        });

        /* Parse reply recipients — Reply All: sender as To, all other participants as CC */
        var replyTo = latestInbound.fromEmail || latestInbound.from;
        var ccSet = {};
        /* Add original To recipients (minus user) to CC */
        if (latestInbound.to) {
          latestInbound.to.split(',').forEach(function(e) {
            var addr = extractEmail(e.trim()).toLowerCase();
            if (addr && addr !== userEmail) ccSet[addr] = e.trim();
          });
        }
        /* Add original CC recipients (minus user) to CC */
        if (latestInbound.cc) {
          latestInbound.cc.split(',').forEach(function(e) {
            var addr = extractEmail(e.trim()).toLowerCase();
            if (addr && addr !== userEmail) ccSet[addr] = e.trim();
          });
        }
        /* Remove the reply-to sender from CC (they're already in To) */
        var replyToLower = extractEmail(replyTo).toLowerCase();
        delete ccSet[replyToLower];
        var ccArray = Object.values(ccSet);

        var replySubject = (thread.subject || latestInbound.subject || '');
        if (replySubject && !replySubject.match(/^re:/i)) replySubject = 'Re: ' + replySubject;

        /* INSERT draft (ON CONFLICT DO NOTHING for unique partial index) */
        var insertRes = await client.from('ai_email_drafts').insert({
          user_id: userId,
          thread_id: thread.thread_id,
          message_id: latestInbound.id,
          subject: replySubject,
          to_addresses: JSON.stringify([replyTo]),
          cc_addresses: JSON.stringify(ccArray),
          body_html: result.draft,
          body_text: stripHtmlBasic(result.draft),
          original_snippet: thread.ai_summary || (latestInbound.body || '').substring(0, 200),
          original_from: latestInbound.from,
          original_date: latestInbound.date,
          kb_chunks_used: result.chunks_searched,
          kb_sources: JSON.stringify(result.kb_sources),
          client_id: thread.client_id || null,
          end_client: thread.end_client || null,
          campaign_id: thread.campaign_id || null,
          opportunity_id: thread.opportunity_id || null,
          status: 'pending',
          batch_run_id: batchRunId,
          ai_model: result.ai_model
        }).select('id');

        if (insertRes.error) {
          /* Unique constraint violation = draft already exists, skip */
          if (insertRes.error.code === '23505') {
            addSkipReason(summary, 'draft_already_exists');
            continue;
          }
          throw insertRes.error;
        }

        /* Update gmail_threads reply_status */
        await client.from('gmail_threads')
          .update({ reply_status: 'draft_created' })
          .eq('user_id', userId)
          .eq('thread_id', thread.thread_id);

        summary.drafts_created++;
        summary.drafts.push({
          thread_id: thread.thread_id,
          subject: thread.subject,
          from: latestInbound.from,
          client: crmContext ? crmContext.clientName : null
        });

      } catch (threadErr) {
        console.error('Error drafting for thread ' + thread.thread_id + ':', threadErr.message);
        addSkipReason(summary, 'draft_error');
      }
    }

    return res.status(200).json(summary);

  } catch (e) {
    console.error('batch-draft error:', e);
    return res.status(200).json({ success: false, error: e.message });
  }
};


/* ═══════════ Helpers ═══════════ */

function addSkipReason(summary, reason) {
  summary.skip_reasons[reason] = (summary.skip_reasons[reason] || 0) + 1;
}

function extractName(fromRaw) {
  if (!fromRaw) return '';
  var match = fromRaw.match(/^(.+?)\s*<(.+?)>$/);
  return match ? match[1].replace(/"/g, '').trim() : fromRaw.trim();
}

function extractEmail(fromRaw) {
  if (!fromRaw) return '';
  var match = fromRaw.match(/<(.+?)>/);
  return match ? match[1].trim() : fromRaw.trim();
}

function extractBody(payload) {
  if (!payload) return '';
  if (payload.body && payload.body.data) return decodeBase64Url(payload.body.data);
  var parts = payload.parts || [];
  var htmlBody = '', textBody = '';
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].mimeType === 'text/html' && parts[i].body && parts[i].body.data) {
      htmlBody = decodeBase64Url(parts[i].body.data);
    } else if (parts[i].mimeType === 'text/plain' && parts[i].body && parts[i].body.data) {
      textBody = decodeBase64Url(parts[i].body.data);
    } else if (parts[i].parts) {
      var nested = extractBody(parts[i]);
      if (nested) { if (!htmlBody) htmlBody = nested; }
    }
  }
  return htmlBody || textBody;
}

function decodeBase64Url(data) {
  var base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

function stripHtmlBasic(html) {
  if (!html) return '';
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').trim();
}


/* ═══════════ Email Embedding (reuses ingest-emails logic) ═══════════ */

async function embedRecentThreads(supaClient, userId, gmailAccessToken) {
  var openaiKey = await getOpenAIKey(userId);
  if (!openaiKey) return 0;

  /* Find un-embedded INBOX threads */
  var allRes = await supaClient.from('gmail_threads')
    .select('thread_id, subject, from_email, from_name, client_id, end_client, campaign_id, last_message_at')
    .eq('user_id', userId)
    .ilike('labels', '%INBOX%')
    .order('last_message_at', { ascending: false })
    .limit(200);
  var allThreads = allRes.data || [];

  var existingRes = await supaClient.from('knowledge_sources')
    .select('source_id, updated_at')
    .eq('user_id', userId)
    .eq('source_type', 'email');
  var embeddedMap = {};
  (existingRes.data || []).forEach(function(r) { embeddedMap[r.source_id] = r.updated_at || ''; });

  var threads = allThreads.filter(function(t) {
    var lastIngested = embeddedMap[t.thread_id];
    if (!lastIngested) return true;
    if (t.last_message_at && new Date(t.last_message_at) > new Date(lastIngested)) return true;
    return false;
  }).slice(0, 25);

  if (!threads.length) return 0;

  var allChunks = [];
  var processed = 0;

  for (var i = 0; i < threads.length; i++) {
    var thread = threads[i];
    try {
      var threadResp = await fetch(
        GMAIL_API + '/threads/' + thread.thread_id + '?format=full',
        { headers: { 'Authorization': 'Bearer ' + gmailAccessToken } }
      );
      if (!threadResp.ok) continue;
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
        return {
          from: fromRaw,
          fromName: extractName(fromRaw),
          date: new Date(parseInt(msg.internalDate)).toISOString(),
          body: txtBody,
          subject: getHeader('Subject')
        };
      }).filter(function(m) { return m.body.trim().length > 0; });

      if (!messages.length) continue;
      var chunks = chunkEmailThread(
        thread.thread_id,
        thread.subject || messages[0].subject || '',
        messages,
        { client_id: thread.client_id, end_client: thread.end_client || '', campaign_id: thread.campaign_id }
      );
      chunks.forEach(function(c) { c._threadId = thread.thread_id; c._subject = thread.subject || ''; allChunks.push(c); });
      processed++;
    } catch (e) { /* skip */ }
  }

  if (!allChunks.length) return processed;

  var texts = allChunks.map(function(c) { return c.content; });
  var embeddings = await embedTexts(openaiKey, texts);
  var totalTokens = 0;
  for (var j = 0; j < allChunks.length; j++) {
    allChunks[j].embedding = embeddings[j].embedding;
    allChunks[j].tokens = embeddings[j].tokens;
    totalTokens += embeddings[j].tokens;
  }

  var threadChunksMap = {};
  allChunks.forEach(function(c) {
    if (!threadChunksMap[c._threadId]) threadChunksMap[c._threadId] = [];
    threadChunksMap[c._threadId].push(c);
  });

  var threadKeys = Object.keys(threadChunksMap);
  for (var k = 0; k < threadKeys.length; k++) {
    var tId = threadKeys[k];
    var tChunks = threadChunksMap[tId];
    await storeChunks(supaClient, userId, 'email', tId, tChunks);
    var tTokens = tChunks.reduce(function(s, c) { return s + (c.tokens || 0); }, 0);
    await upsertSource(supaClient, userId, 'email', tId, tChunks[0]._subject, 'complete', tChunks.length, tTokens, '');
  }

  return processed;
}

function extractTextBody(payload) {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body && payload.body.data) {
    return stripQuotedReply(decodeBase64Url(payload.body.data));
  }
  var parts = payload.parts || [];
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].mimeType === 'text/plain' && parts[i].body && parts[i].body.data) {
      return stripQuotedReply(decodeBase64Url(parts[i].body.data));
    }
    if (parts[i].parts) { var nested = extractTextBody(parts[i]); if (nested) return nested; }
  }
  for (var j = 0; j < parts.length; j++) {
    if (parts[j].mimeType === 'text/html' && parts[j].body && parts[j].body.data) {
      var html = decodeBase64Url(parts[j].body.data);
      html = html.replace(/<div[^>]*class="gmail_quote"[^>]*>[\s\S]*$/i, '');
      html = html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
      return stripQuotedReply(html);
    }
  }
  return '';
}
