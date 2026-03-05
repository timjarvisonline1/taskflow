/**
 * POST /api/knowledge/ingest-document
 * ======================================
 * Embeds manually provided text content (paste, document text, etc.)
 *
 * Body: { content, title, clientId, tags, sourceType }
 * Returns: { chunks, tokens }
 */

const { getServiceClient, verifyUserToken, cors } = require('../_lib/supabase');
const { getOpenAIKey, embedTexts, chunkText, storeChunks, upsertSource, contentHash } = require('../_lib/embeddings');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  var userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    var openaiKey = await getOpenAIKey(userId);
    if (!openaiKey) return res.status(400).json({ error: 'OpenAI API key not configured' });

    var body = req.body || {};
    var content = body.content;
    if (!content || content.trim().length < 50) {
      return res.status(400).json({ error: 'Content must be at least 50 characters' });
    }

    var title = body.title || 'Untitled Document';
    var sourceType = body.sourceType || 'document';
    // Use content hash as source_id for dedup
    var sourceId = body.sourceId || contentHash(title + ':' + content.substring(0, 200));

    // Chunk
    var textChunks = chunkText(content, 2000, 200);
    var chunks = textChunks.map(function(tc, idx) {
      return {
        title: title + (textChunks.length > 1 ? ' - Part ' + (idx + 1) : ''),
        content: tc,
        metadata: {
          client_id: body.clientId || null,
          end_client: body.endClient || '',
          campaign_id: body.campaignId || null,
          date: new Date().toISOString(),
          people: [],
          tags: body.tags || []
        }
      };
    });

    // Embed
    var texts = chunks.map(function(c) { return c.content; });
    var embeddings = await embedTexts(openaiKey, texts);

    var totalTokens = 0;
    for (var i = 0; i < chunks.length; i++) {
      chunks[i].embedding = embeddings[i].embedding;
      chunks[i].tokens = embeddings[i].tokens;
      totalTokens += embeddings[i].tokens;
    }

    // Store
    var client = getServiceClient();
    var result = await storeChunks(client, userId, sourceType, sourceId, chunks);
    await upsertSource(client, userId, sourceType, sourceId, title, 'complete', chunks.length, totalTokens, '');

    return res.status(200).json({
      title: title,
      sourceId: sourceId,
      chunks: result.inserted + result.updated,
      tokens: totalTokens
    });

  } catch (e) {
    console.error('ingest-document error:', e);
    return res.status(500).json({ error: e.message });
  }
};
