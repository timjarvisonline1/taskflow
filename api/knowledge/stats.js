/**
 * GET /api/knowledge/stats
 * ==========================
 * Returns knowledge base statistics for display in settings/dashboard.
 *
 * Returns: { totalChunks, totalTokens, totalSources, byType: {...}, estimatedCost }
 */

const { getServiceClient, verifyUserToken, cors } = require('../_lib/supabase');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  var userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    var client = getServiceClient();

    // Get source stats grouped by type
    var sourcesRes = await client.from('knowledge_sources')
      .select('source_type, chunks_count, tokens_used, status')
      .eq('user_id', userId);

    var sources = sourcesRes.data || [];
    var byType = {};
    var totalChunks = 0;
    var totalTokens = 0;
    var totalSources = 0;

    sources.forEach(function(s) {
      if (!byType[s.source_type]) {
        byType[s.source_type] = { sources: 0, chunks: 0, tokens: 0 };
      }
      byType[s.source_type].sources++;
      byType[s.source_type].chunks += s.chunks_count || 0;
      byType[s.source_type].tokens += s.tokens_used || 0;
      totalChunks += s.chunks_count || 0;
      totalTokens += s.tokens_used || 0;
      totalSources++;
    });

    // Estimated cost at $0.02 per 1M tokens
    var estimatedCost = totalTokens * 0.00002 / 1000;

    return res.status(200).json({
      totalChunks: totalChunks,
      totalTokens: totalTokens,
      totalSources: totalSources,
      byType: byType,
      estimatedCost: Math.round(estimatedCost * 10000) / 10000
    });

  } catch (e) {
    console.error('knowledge stats error:', e);
    return res.status(500).json({ error: e.message });
  }
};
