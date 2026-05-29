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

    // Fetch meetings from Read.ai API using time-window pagination.
    // Read.ai's offset/cursor pagination is broken — always returns the same page.
    // Instead we shift the upper time bound backwards after each batch.
    var allMeetings = [];
    var seenIds = {};
    var MAX_ROUNDS = 50;
    var upperMs = Date.now() + 86400000; // tomorrow, to catch everything

    for (var round = 0; round < MAX_ROUNDS; round++) {
      var url = READAI_API + '/meetings?limit=10' +
        '&start_time_ms.gte=' + startMs +
        '&start_time_ms.lte=' + upperMs;

      log('Round ' + (round + 1) + ': window ' + new Date(startMs).toISOString().substring(0, 10) + ' to ' + new Date(upperMs).toISOString().substring(0, 10));

      var listResp = await fetchWithRetry(url, {
        headers: { 'Authorization': 'Bearer ' + accessToken }
      }, log);
      await sleep(THROTTLE_MS);

      if (!listResp.ok) {
        var errText = await listResp.text();
        throw new Error('Read.ai API returned ' + listResp.status + ': ' + errText.substring(0, 200));
      }

      var listData = await listResp.json();
      var meetings = listData.data || [];
      if (!Array.isArray(meetings) || meetings.length === 0) {
        log('Round ' + (round + 1) + ': 0 meetings returned — done');
        break;
      }

      // Find the oldest meeting timestamp in this batch to shift the window
      var oldestMs = Infinity;
      var newCount = 0;
      for (var mi = 0; mi < meetings.length; mi++) {
        var m = meetings[mi];
        var mid = m.id;
        var mTime = m.start_time_ms || 0;
        if (mTime < oldestMs) oldestMs = mTime;
        if (mid && !seenIds[mid]) {
          seenIds[mid] = true;
          allMeetings.push(m);
          newCount++;
        }
      }

      log('Round ' + (round + 1) + ': ' + newCount + ' new meetings (total: ' + allMeetings.length + ')');

      if (newCount === 0) {
        log('All duplicates — done');
        break;
      }

      // Shift upper bound to just before the oldest meeting in this batch
      upperMs = oldestMs - 1;
      if (upperMs <= startMs) {
        log('Reached start of backfill window — done');
        break;
      }
    }

    log('Fetched ' + allMeetings.length + ' unique meetings. Processing...');

    // Process each meeting — use list data directly (no separate detail fetch needed)
    var processed = 0;
    for (var i = 0; i < allMeetings.length; i++) {
      var m = allMeetings[i];
      try {
        var sessionId = m.id || m.session_id || '';
        if (!sessionId) { stats.skipped++; continue; }

        var participants = normaliseParticipants(m.participants);
        var actionItems = normaliseItems(m.action_items);
        var keyQuestions = normaliseItems(m.key_questions);
        var topics = normaliseItems(m.topics);
        var chapterSummaries = normaliseChapters(m.chapter_summaries);
        var transcript = normaliseTranscript(m.transcript);
        var summary = m.summary || m.meeting_summary || '';

        var ownerName = '', ownerEmail = '';
        if (m.owner && typeof m.owner === 'object') {
          ownerName = m.owner.name || '';
          ownerEmail = m.owner.email || '';
        } else {
          ownerEmail = m.owner_email || '';
        }

        // Timestamps: API returns start_time_ms/end_time_ms as numbers
        var startTime = m.start_time || null;
        var endTime = m.end_time || null;
        if (!startTime && m.start_time_ms) startTime = new Date(m.start_time_ms).toISOString();
        if (!endTime && m.end_time_ms) endTime = new Date(m.end_time_ms).toISOString();

        var durationMinutes = 0;
        if (startTime && endTime) {
          var diff = new Date(endTime) - new Date(startTime);
          if (!isNaN(diff) && diff > 0) durationMinutes = Math.round(diff / 60000);
        }

        // Auto-match client
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

        var row = {
          user_id: userId,
          session_id: sessionId,
          title: m.title || '',
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
          report_url: m.report_url || '',
          client_id: clientId,
          source: 'readai',
          raw_payload: m,
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

        processed++;
        if (isNew) {
          stats.inserted++;
          existingIds[sessionId] = true;
          log('[' + processed + '/' + allMeetings.length + '] NEW: "' + (m.title || '').substring(0, 60) + '"');
        } else {
          stats.updated++;
          if (processed <= 5 || processed % 10 === 0) {
            log('[' + processed + '/' + allMeetings.length + '] Updated: "' + (m.title || '').substring(0, 60) + '"');
          }
        }
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
