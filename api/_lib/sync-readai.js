const { getServiceClient, getCredentials, updateSyncStatus } = require('./supabase');
const { refreshReadaiToken } = require('./readai-auth');

const READAI_API = 'https://api.read.ai/v1';
const BACKFILL_START_MS = 1775520000000; // April 7, 2026 00:00 UTC
const THROTTLE_MS = 700; // ~85 req/min, under the 100/min limit

function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

async function fetchWithRetry(url, opts, log) {
  for (var attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) {
      var backoff = attempt * 10000; // 10s, 20s, 30s
      log('Rate limited (429), waiting ' + (backoff / 1000) + 's before retry ' + attempt + '/3...');
      await sleep(backoff);
    }
    var resp = await fetch(url, opts);
    if (resp.status !== 429) return resp;
  }
  return resp; // return the 429 if all retries exhausted
}

/**
 * Sync Read.ai meetings to Supabase via the API.
 * On first run (no last_sync_at), pulls all meetings since April 7 2026 (backfill).
 * On subsequent runs, pulls meetings since last sync.
 */
async function syncReadai(userId, emit) {
  const credRow = await getCredentials(userId, 'readai');
  if (!credRow) throw new Error('Read.ai not connected');

  const creds = credRow.credentials || {};
  if (!creds.access_token && !creds.refresh_token) {
    throw new Error('Read.ai not authorized. Click Connect Read.ai first.');
  }

  const stats = { fetched: 0, inserted: 0, updated: 0, skipped: 0, tasks_generated: 0, chunks_embedded: 0, error: null, debug: [] };
  function log(msg) {
    stats.debug.push(msg);
    console.log('[readai-sync] ' + msg);
    if (emit) emit({ type: 'log', message: msg });
  }

  try {
    const accessToken = await refreshReadaiToken(credRow);
    const client = getServiceClient();

    var startMs = BACKFILL_START_MS;
    log('Token refreshed OK');
    log('Sync mode: BACKFILL from Apr 7 2026 (always starts here, upsert handles dedup)');
    log('Start timestamp (ms): ' + startMs + ' = ' + new Date(startMs).toISOString());

    // Load existing session_ids for dedup
    var existingRes = await client
      .from('meetings')
      .select('session_id')
      .eq('user_id', userId);
    var existingIds = {};
    (existingRes.data || []).forEach(function(r) { if (r.session_id) existingIds[r.session_id] = true; });

    // Load contacts + clients for auto-matching (same logic as webhook)
    var contactRes = await client.from('contacts').select('email, client_id').eq('user_id', userId);
    var contactMap = {};
    (contactRes.data || []).forEach(function(c) {
      if (c.email && c.client_id) contactMap[c.email.toLowerCase()] = c.client_id;
    });

    var clientRes = await client.from('clients').select('id, email').eq('user_id', userId);
    var clientEmailMap = {};
    (clientRes.data || []).forEach(function(c) {
      if (c.email) clientEmailMap[c.email.toLowerCase()] = c.id;
    });

    // Get user's own email to skip in matching
    var ownerEmailLower = '';
    try {
      var userData = await client.auth.admin.getUserById(userId);
      if (userData.data && userData.data.user && userData.data.user.email) {
        ownerEmailLower = userData.data.user.email.toLowerCase();
      }
    } catch (e) { /* ignore */ }

    // Paginate through Read.ai meetings API
    var allMeetings = [];
    var hasMore = true;
    var offset = 0;
    var PAGE_SIZE = 10;
    var MAX_PAGES = 200; // Safety: 2000 meetings max

    for (var page = 0; page < MAX_PAGES && hasMore; page++) {
      var url = READAI_API + '/meetings?limit=' + PAGE_SIZE +
        '&start_time_ms.gte=' + startMs +
        '&offset=' + offset;

      log('Page ' + (page + 1) + ': GET ' + url);

      var listResp = await fetchWithRetry(url, {
        headers: { 'Authorization': 'Bearer ' + accessToken }
      }, log);
      await sleep(THROTTLE_MS);

      var respText = await listResp.text();
      log('Response HTTP ' + listResp.status + ' (' + respText.length + ' bytes): ' + respText.substring(0, 300));

      if (!listResp.ok) {
        throw new Error('Read.ai API returned ' + listResp.status + ': ' + respText.substring(0, 200));
      }

      var listData;
      try { listData = JSON.parse(respText); } catch (e) {
        throw new Error('Read.ai API returned non-JSON: ' + respText.substring(0, 200));
      }
      var meetings = listData.data || listData.meetings || listData || [];
      if (!Array.isArray(meetings)) meetings = [];

      allMeetings = allMeetings.concat(meetings);
      stats.fetched += meetings.length;

      // Check for more pages
      if (meetings.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        offset += PAGE_SIZE;
      }

      // Refresh token mid-pagination if needed (tokens expire every 10 min)
      if (page > 0 && page % 5 === 0) {
        var freshCred = await getCredentials(userId, 'readai');
        if (freshCred) await refreshReadaiToken(freshCred);
      }
    }

    log('Total meetings fetched from API: ' + allMeetings.length);

    // Process each meeting
    for (var i = 0; i < allMeetings.length; i++) {
      var meeting = allMeetings[i];
      try {
        var sessionId = meeting.id || meeting.session_id || '';
        if (!sessionId) { log('Skipping meeting with no session_id'); stats.skipped++; continue; }

        // Fetch full meeting detail (includes transcript, summary, etc.)
        var detailResp = await fetchWithRetry(READAI_API + '/meetings/' + sessionId, {
          headers: { 'Authorization': 'Bearer ' + accessToken }
        }, log);
        await sleep(THROTTLE_MS);
        if (!detailResp.ok) {
          log('Failed to fetch detail for ' + sessionId + ': HTTP ' + detailResp.status);
          stats.skipped++;
          continue;
        }
        var detail = await detailResp.json();

        // Normalise fields
        var participants = normaliseParticipants(detail.participants);
        var actionItems = normaliseItems(detail.action_items);
        var keyQuestions = normaliseItems(detail.key_questions);
        var topics = normaliseItems(detail.topics);
        var chapterSummaries = normaliseChapters(detail.chapter_summaries);
        var transcript = normaliseTranscript(detail.transcript);
        var summary = detail.summary || detail.meeting_summary || '';

        var ownerName = '', ownerEmail = '';
        if (detail.owner && typeof detail.owner === 'object') {
          ownerName = detail.owner.name || '';
          ownerEmail = detail.owner.email || '';
        } else {
          ownerEmail = detail.owner_email || '';
        }

        var startTime = detail.start_time || detail.meeting_start_time || null;
        var endTime = detail.end_time || detail.meeting_end_time || null;

        var durationMinutes = 0;
        if (startTime && endTime) {
          var diff = new Date(endTime) - new Date(startTime);
          if (!isNaN(diff) && diff > 0) durationMinutes = Math.round(diff / 60000);
        }

        // Auto-match client from participant emails
        var clientId = null;
        var participantEmails = participants.map(function(p) { return (p.email || '').toLowerCase(); }).filter(Boolean);
        var ownerLower = (ownerEmail || '').toLowerCase() || ownerEmailLower;

        for (var j = 0; j < participantEmails.length; j++) {
          var pe = participantEmails[j];
          if (pe === ownerLower) continue;
          if (contactMap[pe]) { clientId = contactMap[pe]; break; }
          if (clientEmailMap[pe]) { clientId = clientEmailMap[pe]; break; }
        }

        var isNew = !existingIds[sessionId];

        // Upsert meeting row
        var row = {
          user_id: userId,
          session_id: sessionId,
          title: detail.title || meeting.title || '',
          start_time: startTime,
          end_time: endTime,
          duration_minutes: durationMinutes,
          participants: participants,
          owner_name: ownerName,
          owner_email: ownerEmail,
          summary: summary,
          transcript: transcript,
          action_items: actionItems,
          key_questions: keyQuestions,
          topics: topics,
          chapter_summaries: chapterSummaries,
          report_url: detail.report_url || '',
          client_id: clientId,
          source: 'readai',
          raw_payload: detail,
          updated_at: new Date().toISOString()
        };

        var result = await client
          .from('meetings')
          .upsert(row, { onConflict: 'user_id,session_id' });

        if (result.error) {
          log('Upsert error for ' + sessionId + ': ' + result.error.message);
          stats.skipped++;
          continue;
        }

        if (isNew) {
          stats.inserted++;
          existingIds[sessionId] = true;
          log('[' + (i + 1) + '/' + allMeetings.length + '] NEW: "' + (detail.title || '').substring(0, 60) + '" (' + sessionId.substring(0, 8) + ')');
        } else {
          stats.updated++;
          log('[' + (i + 1) + '/' + allMeetings.length + '] Updated: "' + (detail.title || '').substring(0, 60) + '"');
        }

        // AI task generation + KB embedding skipped during bulk sync (too slow).
        // The webhook handles these for real-time meetings. For backfilled meetings,
        // use /api/knowledge/ingest-meetings to embed and the background knowledge
        // sync will pick them up over time.
      } catch (meetingErr) {
        log('Error processing meeting ' + (i + 1) + ': ' + meetingErr.message);
        stats.skipped++;
      }
    }

    await updateSyncStatus(userId, 'readai', 'ok',
      stats.inserted + ' new, ' + stats.updated + ' updated' +
      (stats.skipped ? ', ' + stats.skipped + ' skipped' : '') +
      (stats.tasks_generated ? ', ' + stats.tasks_generated + ' tasks' : '') +
      (stats.chunks_embedded ? ', ' + stats.chunks_embedded + ' embedded' : ''));

    log('Done! ' + stats.inserted + ' new, ' + stats.updated + ' updated, ' + stats.skipped + ' skipped, ' + stats.tasks_generated + ' tasks, ' + stats.chunks_embedded + ' chunks embedded');
    return stats;
  } catch (e) {
    stats.error = e.message;
    await updateSyncStatus(userId, 'readai', 'error', e.message);
    throw e;
  }
}

/* ── Normalisation helpers (same as webhook handler) ── */

function normaliseParticipants(val) {
  if (Array.isArray(val)) return val.map(function(p) { return { name: p.name || '', email: p.email || '' }; });
  if (typeof val === 'string') return parseParticipantsText(val);
  return [];
}

function normaliseItems(val) {
  if (Array.isArray(val)) return val.map(function(i) { return { text: i.text || (typeof i === 'string' ? i : '') }; });
  if (typeof val === 'string') return parseBulletedText(val);
  return [];
}

function normaliseChapters(val) {
  if (Array.isArray(val)) return val.map(function(c) {
    return { title: c.title || '', description: c.description || '', topics: c.topics || '' };
  });
  return [];
}

function normaliseTranscript(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object' && !Array.isArray(val) && Array.isArray(val.speaker_blocks)) {
    return formatTranscriptBlocks(val.speaker_blocks);
  }
  if (Array.isArray(val)) return formatTranscriptBlocks(val);
  return '';
}

function formatTranscriptBlocks(blocks) {
  return blocks.map(function(seg) {
    var name = (seg.speaker && seg.speaker.name) || seg.speaker_name || '';
    var ts = '';
    if (seg.start_time) {
      var ms = seg.start_time > 1e12 ? seg.start_time : seg.start_time * 1000;
      var d = new Date(ms);
      if (!isNaN(d.getTime())) {
        ts = String(d.getHours()).padStart(2, '0') + ':' +
             String(d.getMinutes()).padStart(2, '0') + ':' +
             String(d.getSeconds()).padStart(2, '0');
      }
    }
    var w = seg.words || seg.text || '';
    return (ts ? '[' + ts + '] ' : '') + (name ? name + ': ' : '') + w;
  }).join('\n');
}

function parseParticipantsText(raw) {
  if (!raw || typeof raw !== 'string') return [];
  var entries = raw.split('\n\n');
  var result = [];
  entries.forEach(function(entry) {
    var p = {};
    entry.split('\n').forEach(function(line) {
      var idx = line.indexOf(':');
      if (idx > -1) {
        p[line.substring(0, idx).trim()] = line.substring(idx + 1).trim();
      }
    });
    if (p.name || p.email) result.push({ name: p.name || '', email: p.email || '' });
  });
  return result;
}

function parseBulletedText(raw) {
  if (!raw || typeof raw !== 'string') return [];
  return raw.split('\n')
    .filter(function(l) { return l.trim() !== ''; })
    .map(function(l) { return { text: l.replace(/^text:\s*/, '').trim() }; });
}

module.exports = { syncReadai };
