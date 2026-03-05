/**
 * POST /api/knowledge/search
 * ============================
 * Searches the knowledge base via vector similarity.
 *
 * Body: { query, sourceType, clientId, limit }
 * Returns: { results: [{title, content, source_type, similarity, date}] }
 */

const { getServiceClient, verifyUserToken, cors } = require('../_lib/supabase');
const { getOpenAIKey, embedTexts, searchKnowledge } = require('../_lib/embeddings');

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
    var query = body.query;
    if (!query || query.trim().length < 3) {
      return res.status(400).json({ error: 'Query must be at least 3 characters' });
    }

    // Embed query
    var embeddings = await embedTexts(openaiKey, [query]);
    var queryEmbedding = embeddings[0].embedding;

    // Search
    var client = getServiceClient();
    var results = await searchKnowledge(client, userId, queryEmbedding, {
      sourceType: body.sourceType || null,
      clientId: body.clientId || null,
      limit: Math.min(body.limit || 10, 50),
      threshold: body.threshold || 0.3
    });

    return res.status(200).json({
      results: results.map(function(r) {
        return {
          id: r.id,
          title: r.title,
          content: r.content.substring(0, 500),
          source_type: r.source_type,
          source_id: r.source_id,
          date: r.date,
          similarity: Math.round(r.similarity * 100)
        };
      }),
      query: query
    });

  } catch (e) {
    console.error('knowledge search error:', e);
    return res.status(500).json({ error: e.message });
  }
};
