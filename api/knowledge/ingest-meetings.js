/**
 * POST /api/knowledge/ingest-meetings
 * =====================================
 * Embeds meeting transcripts into the knowledge base.
 *
 * Body: { meetingIds: [uuid, ...] }  (optional, defaults to un-embedded meetings)
 *
 * Processes up to 10 meetings per call (60-second timeout).
 * Returns: { processed, chunks, tokens, remaining }
 */

const { getServiceClient, verifyUserToken, cors } = require('../_lib/supabase');
const { getOpenAIKey, embedTexts, chunkMeeting, storeChunks, upsertSource } = require('../_lib/embeddings');

const BATCH_SIZE = 10;

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  var userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    var apiKey = await getOpenAIKey(userId);
    if (!apiKey) return res.status(400).json({ error: 'OpenAI API key not configured. Add it in Settings.' });

    var client = getServiceClient();
    var body = req.body || {};
    var meetingIds = body.meetingIds || null;
    var meetings = [];

    if (meetingIds && meetingIds.length > 0) {
      // Specific meetings requested
      var mRes = await client.from('meetings')
        .select('id, title, start_time, end_time, summary, transcript, action_items, chapter_summaries, participants, client_id, end_client, campaign_id')
        .in('id', meetingIds.slice(0, BATCH_SIZE));
      meetings = mRes.data || [];
    } else {
      // Find un-embedded meetings (ones with transcripts not yet in knowledge_chunks)
      // Get meetings with transcripts
      var allRes = await client.from('meetings')
        .select('id, title, start_time, end_time, summary, transcript, action_items, chapter_summaries, participants, client_id, end_client, campaign_id')
        .eq('user_id', userId)
        .or('transcript.neq.,summary.neq.')
        .order('start_time', { ascending: false })
        .limit(200);

      var allMeetings = allRes.data || [];

      // Check which ones already have embeddings
      var existingRes = await client.from('knowledge_chunks')
        .select('source_id')
        .eq('user_id', userId)
        .eq('source_type', 'meeting');

      var embeddedIds = {};
      (existingRes.data || []).forEach(function(r) { embeddedIds[r.source_id] = true; });

      meetings = allMeetings.filter(function(m) {
        return !embeddedIds[m.id] && (m.transcript || m.summary);
      }).slice(0, BATCH_SIZE);
    }

    if (meetings.length === 0) {
      return res.status(200).json({ processed: 0, chunks: 0, tokens: 0, remaining: 0, message: 'No meetings to process' });
    }

    // Chunk all meetings
    var allChunks = [];
    var chunkMeetingMap = []; // tracks which chunks belong to which meeting

    meetings.forEach(function(mtg) {
      var chunks = chunkMeeting(mtg);
      chunks.forEach(function(c) {
        c._meetingId = mtg.id;
        c._meetingTitle = mtg.title || 'Untitled Meeting';
        allChunks.push(c);
      });
    });

    if (allChunks.length === 0) {
      return res.status(200).json({ processed: meetings.length, chunks: 0, tokens: 0, remaining: 0, message: 'No content to embed' });
    }

    // Embed all chunk contents in one batch
    var texts = allChunks.map(function(c) { return c.content; });
    var embeddings = await embedTexts(apiKey, texts);

    // Attach embeddings to chunks
    var totalTokens = 0;
    for (var i = 0; i < allChunks.length; i++) {
      allChunks[i].embedding = embeddings[i].embedding;
      allChunks[i].tokens = embeddings[i].tokens;
      totalTokens += embeddings[i].tokens;
    }

    // Group chunks by meeting and store
    var meetingChunksMap = {};
    allChunks.forEach(function(c) {
      if (!meetingChunksMap[c._meetingId]) meetingChunksMap[c._meetingId] = [];
      meetingChunksMap[c._meetingId].push(c);
    });

    var totalStored = 0;
    var meetingKeys = Object.keys(meetingChunksMap);
    for (var j = 0; j < meetingKeys.length; j++) {
      var mId = meetingKeys[j];
      var mChunks = meetingChunksMap[mId];
      var result = await storeChunks(client, userId, 'meeting', mId, mChunks);
      totalStored += result.inserted + result.updated;

      // Track source
      var mTokens = mChunks.reduce(function(sum, c) { return sum + (c.tokens || 0); }, 0);
      await upsertSource(client, userId, 'meeting', mId, mChunks[0]._meetingTitle, 'complete', mChunks.length, mTokens, '');
    }

    // Count remaining
    var remainRes = await client.from('meetings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .or('transcript.neq.,summary.neq.');
    var totalWithContent = remainRes.count || 0;

    var embeddedRes = await client.from('knowledge_sources')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('source_type', 'meeting')
      .eq('status', 'complete');
    var totalEmbedded = embeddedRes.count || 0;

    return res.status(200).json({
      processed: meetings.length,
      chunks: totalStored,
      tokens: totalTokens,
      remaining: Math.max(0, totalWithContent - totalEmbedded)
    });

  } catch (e) {
    console.error('ingest-meetings error:', e);
    return res.status(500).json({ error: e.message });
  }
};
