const { getServiceClient } = require('../_lib/supabase');
const { analyzeMeetingForTasks } = require('../_lib/analyze-meeting');

/* ── Text-format parsers (Read.ai via Zapier sends text; direct webhook may send JSON) ── */

function parseTranscriptText(raw) {
  if (!raw || typeof raw !== 'string') return '';
  var lines = raw.split('\n').filter(function(l) { return l.trim() !== ''; });
  var transcript = '';
  var speaker = null, startTime = null, words = null;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line.startsWith('end_time:')) continue;
    if (line.startsWith('speaker:')) {
      var m = line.match(/\{'name': '([^']+)'\}/) || line.match(/\{"name":\s*"([^"]+)"\}/);
      if (m && m[1]) speaker = m[1];
    } else if (line.startsWith('start_time:')) {
      var ts = parseInt(line.split(':').slice(1).join(':').trim());
      if (!isNaN(ts)) {
        var d = new Date(ts * 1000);
        var hh = String(d.getHours()).padStart(2, '0');
        var mm = String(d.getMinutes()).padStart(2, '0');
        var ss = String(d.getSeconds()).padStart(2, '0');
        startTime = hh + ':' + mm + ':' + ss;
      }
    } else if (line.startsWith('words:')) {
      words = line.substring(6).trim();
      if (speaker && startTime && words) {
        transcript += '[' + startTime + '] ' + speaker + ': ' + words + '\n';
        speaker = null; startTime = null; words = null;
      }
    }
  }
  return transcript;
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
        var key = line.substring(0, idx).trim();
        var val = line.substring(idx + 1).trim();
        p[key] = val;
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

function parseChapterSummariesText(raw) {
  if (!raw || typeof raw !== 'string') return [];
  var lines = raw.split('\n');
  var elements = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line.startsWith('title:')) {
      elements.push({ type: 'title', pos: i, value: line.substring(6).trim() });
    } else if (line.startsWith('description:')) {
      elements.push({ type: 'description', pos: i, value: line.substring(12).trim() });
    } else if (line.startsWith('topics:')) {
      var topicsStr = line.substring(7).trim();
      var topicsVal = topicsStr;
      try {
        var arr = JSON.parse(topicsStr.replace(/'/g, '"'));
        topicsVal = arr.map(function(t) { return t.text || ''; }).join(', ');
      } catch (e) { /* keep as string */ }
      elements.push({ type: 'topics', pos: i, value: topicsVal });
    }
  }

  // Group by title positions
  var titleIdxs = [];
  elements.forEach(function(el, idx) { if (el.type === 'title') titleIdxs.push(idx); });
  var chapters = [];
  for (var j = 0; j < titleIdxs.length; j++) {
    var start = titleIdxs[j];
    var end = j < titleIdxs.length - 1 ? titleIdxs[j + 1] : elements.length;
    var chunk = elements.slice(start, end);
    var title = (chunk.find(function(e) { return e.type === 'title'; }) || {}).value || '';
    var desc = (chunk.find(function(e) { return e.type === 'description'; }) || {}).value || '';
    var topics = (chunk.find(function(e) { return e.type === 'topics'; }) || {}).value || '';
    chapters.push({ title: title, description: desc, topics: topics });
  }
  return chapters;
}

/* ── Normalise payload fields (handle both JSON and text formats) ── */

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
  if (typeof val === 'string') return parseChapterSummariesText(val);
  return [];
}

function formatTranscriptBlocks(blocks) {
  return blocks.map(function(seg) {
    var name = (seg.speaker && seg.speaker.name) || seg.speaker_name || '';
    var ts = '';
    if (seg.start_time) {
      // Timestamps > 1e12 are milliseconds; otherwise seconds
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

function normaliseTranscript(val) {
  if (!val) return '';
  if (typeof val === 'string') {
    if (val.indexOf('speaker:') > -1 && val.indexOf('words:') > -1) return parseTranscriptText(val);
    return val;
  }
  // Object with speaker_blocks array (Read.ai direct webhook format)
  if (val && typeof val === 'object' && !Array.isArray(val) && Array.isArray(val.speaker_blocks)) {
    return formatTranscriptBlocks(val.speaker_blocks);
  }
  // Array of segments
  if (Array.isArray(val)) {
    return formatTranscriptBlocks(val);
  }
  return '';
}

/* ── Main handler ── */

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    var event = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

    // Validate webhook secret
    var secret = req.query.secret || req.headers['x-readai-secret'] || '';
    if (!secret) return res.status(200).json({ status: 'no_secret' });

    var client = getServiceClient();

    // Find user with matching readai webhook secret
    var credsRes = await client
      .from('integration_credentials')
      .select('user_id, config')
      .eq('platform', 'readai')
      .eq('is_active', true);

    var creds = credsRes.data;
    if (!creds || creds.length === 0) {
      return res.status(200).json({ status: 'no_readai_users' });
    }

    // Match by webhook_secret in config; fall back to first user
    var match = creds.find(function(c) { return (c.config || {}).webhook_secret === secret; });
    if (!match) return res.status(200).json({ status: 'invalid_secret' });
    var userId = match.user_id;

    // Session ID is required for deduplication
    var sessionId = event.session_id || '';
    if (!sessionId) return res.status(200).json({ status: 'no_session_id' });

    // Normalise fields (handle both JSON and text formats)
    var participants = normaliseParticipants(event.participants);
    var actionItems = normaliseItems(event.action_items);
    var keyQuestions = normaliseItems(event.key_questions);
    var topics = normaliseItems(event.topics);
    var chapterSummaries = normaliseChapters(event.chapter_summaries);
    var transcript = normaliseTranscript(event.transcript);
    var summary = event.summary || event.meeting_summary || '';

    // Owner
    var ownerName = '', ownerEmail = '';
    if (event.owner && typeof event.owner === 'object') {
      ownerName = event.owner.name || '';
      ownerEmail = event.owner.email || '';
    } else {
      ownerEmail = event.owner_email || '';
    }

    // Timestamps
    var startTime = event.start_time || event.meeting_start_time || null;
    var endTime = event.end_time || event.meeting_end_time || null;

    // Compute duration
    var durationMinutes = 0;
    if (startTime && endTime) {
      var diff = new Date(endTime) - new Date(startTime);
      if (!isNaN(diff) && diff > 0) durationMinutes = Math.round(diff / 60000);
    }

    // Auto-match client from participant emails
    var clientId = null;
    var participantEmails = participants.map(function(p) { return (p.email || '').toLowerCase(); }).filter(Boolean);

    if (participantEmails.length) {
      // Check contacts table first
      var contactRes = await client
        .from('contacts')
        .select('email, client_id')
        .eq('user_id', userId);
      var contactMap = {};
      (contactRes.data || []).forEach(function(c) {
        if (c.email && c.client_id) contactMap[c.email.toLowerCase()] = c.client_id;
      });

      // Also check client records
      var clientRes = await client
        .from('clients')
        .select('id, email')
        .eq('user_id', userId);
      var clientEmailMap = {};
      (clientRes.data || []).forEach(function(c) {
        if (c.email) clientEmailMap[c.email.toLowerCase()] = c.id;
      });

      // Match: contacts first, then client records (skip owner email)
      var ownerLower = ownerEmail.toLowerCase();
      for (var i = 0; i < participantEmails.length; i++) {
        var pe = participantEmails[i];
        if (pe === ownerLower) continue;
        if (contactMap[pe]) { clientId = contactMap[pe]; break; }
        if (clientEmailMap[pe]) { clientId = clientEmailMap[pe]; break; }
      }
    }

    // Build upsert row
    var row = {
      user_id: userId,
      session_id: sessionId,
      title: event.title || '',
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
      report_url: event.report_url || '',
      client_id: clientId,
      source: 'readai',
      raw_payload: event,
      updated_at: new Date().toISOString()
    };

    var result = await client
      .from('meetings')
      .upsert(row, { onConflict: 'user_id,session_id' });

    if (result.error) throw result.error;

    // AI task generation (best-effort — meeting is already saved)
    var tasksGenerated = 0;
    try {
      var meetingRes = await client
        .from('meetings')
        .select('id, ai_tasks_generated')
        .eq('user_id', userId)
        .eq('session_id', sessionId)
        .single();

      if (meetingRes.data && !meetingRes.data.ai_tasks_generated) {
        tasksGenerated = await analyzeMeetingForTasks(userId, {
          id: meetingRes.data.id,
          owner_name: ownerName,
          owner_email: ownerEmail,
          title: event.title || '',
          start_time: startTime,
          summary: summary,
          transcript: transcript,
          action_items: actionItems,
          participants: participants,
          client_id: clientId
        }, client);
      }
    } catch (aiErr) {
      console.error('Meeting AI analysis error (non-fatal):', aiErr.message);
    }

    return res.status(200).json({ status: 'ok', session_id: sessionId, tasks_generated: tasksGenerated });
  } catch (e) {
    console.error('Read.ai webhook error:', e);
    return res.status(200).json({ status: 'error', error: e.message });
  }
};
