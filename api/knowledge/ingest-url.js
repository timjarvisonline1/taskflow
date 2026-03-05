/**
 * POST /api/knowledge/ingest-url
 * ================================
 * Fetches a web page, extracts text, chunks, and embeds.
 *
 * Body: { url, title, clientId, tags }
 * Returns: { chunks, tokens }
 */

const { getServiceClient, verifyUserToken, cors } = require('../_lib/supabase');
const { getOpenAIKey, embedTexts, chunkWebPage, storeChunks, upsertSource } = require('../_lib/embeddings');

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
    var url = body.url;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    // Normalize URL
    if (!url.startsWith('http')) url = 'https://' + url;

    // Fetch page
    var pageResp = await fetch(url, {
      headers: { 'User-Agent': 'TaskFlow-Bot/1.0' },
      redirect: 'follow'
    });
    if (!pageResp.ok) {
      return res.status(400).json({ error: 'Failed to fetch URL (HTTP ' + pageResp.status + ')' });
    }

    var html = await pageResp.text();

    // Extract text from HTML
    var text = htmlToText(html);
    if (!text || text.length < 50) {
      return res.status(400).json({ error: 'Could not extract meaningful text from the page' });
    }

    // Extract title from HTML if not provided
    var title = body.title || '';
    if (!title) {
      var titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) title = titleMatch[1].trim();
    }
    if (!title) title = url;

    // Chunk
    var chunks = chunkWebPage(text, title, url);
    if (body.clientId) {
      chunks.forEach(function(c) { c.metadata.client_id = body.clientId; });
    }
    if (body.tags && Array.isArray(body.tags)) {
      chunks.forEach(function(c) { c.metadata.tags = body.tags; });
    }

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
    var result = await storeChunks(client, userId, 'webpage', url, chunks);
    await upsertSource(client, userId, 'webpage', url, title, 'complete', chunks.length, totalTokens, '');

    return res.status(200).json({
      url: url,
      title: title,
      chunks: result.inserted + result.updated,
      tokens: totalTokens,
      textLength: text.length
    });

  } catch (e) {
    console.error('ingest-url error:', e);
    return res.status(500).json({ error: e.message });
  }
};


/* ═══════════ HTML to text ═══════════ */

function htmlToText(html) {
  // Remove script, style, nav, footer, header tags and content
  var cleaned = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');

  // Convert block elements to newlines
  cleaned = cleaned
    .replace(/<\/(p|div|li|h[1-6]|tr|blockquote|section|article)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/td>/gi, '\t');

  // Remove remaining tags
  cleaned = cleaned.replace(/<[^>]+>/g, '');

  // Decode entities
  cleaned = cleaned
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '');

  // Clean whitespace
  cleaned = cleaned
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();

  return cleaned;
}
