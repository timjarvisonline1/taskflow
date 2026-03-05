/**
 * POST /api/knowledge/ingest-youtube
 * =====================================
 * Fetches a YouTube video transcript and embeds it.
 *
 * Body: { videoUrl, title, clientId, tags }
 * Returns: { chunks, tokens, videoId, title }
 */

const { getServiceClient, verifyUserToken, cors } = require('../_lib/supabase');
const { getOpenAIKey, embedTexts, chunkText, storeChunks, upsertSource } = require('../_lib/embeddings');

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
    var videoUrl = body.videoUrl || body.url;
    if (!videoUrl) return res.status(400).json({ error: 'YouTube video URL is required' });

    // Extract video ID
    var videoId = extractVideoId(videoUrl);
    if (!videoId) return res.status(400).json({ error: 'Could not extract YouTube video ID from URL' });

    // Fetch transcript via innertube API
    var transcriptResult = await fetchYouTubeTranscript(videoId);
    if (!transcriptResult.transcript) {
      return res.status(400).json({ error: transcriptResult.error || 'Could not fetch transcript. It may not be available for this video.' });
    }

    var title = body.title || transcriptResult.title || 'YouTube Video ' + videoId;
    var transcript = transcriptResult.transcript;

    // Chunk transcript
    var textChunks = chunkText(transcript, 2000, 200);
    var chunks = textChunks.map(function(tc, idx) {
      return {
        title: title + ' - Part ' + (idx + 1),
        content: tc,
        metadata: {
          client_id: body.clientId || null,
          end_client: '',
          campaign_id: null,
          date: new Date().toISOString(),
          people: [],
          tags: body.tags || [],
          url: 'https://www.youtube.com/watch?v=' + videoId
        }
      };
    });

    if (chunks.length === 0) {
      return res.status(400).json({ error: 'No content to embed' });
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
    var result = await storeChunks(client, userId, 'youtube', videoId, chunks);
    await upsertSource(client, userId, 'youtube', videoId, title, 'complete', chunks.length, totalTokens, '');

    return res.status(200).json({
      videoId: videoId,
      title: title,
      chunks: result.inserted + result.updated,
      tokens: totalTokens,
      transcriptLength: transcript.length
    });

  } catch (e) {
    console.error('ingest-youtube error:', e);
    return res.status(500).json({ error: e.message });
  }
};


/* ═══════════ YouTube helpers ═══════════ */

function extractVideoId(url) {
  // Handle various YouTube URL formats
  var patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/  // bare video ID
  ];
  for (var i = 0; i < patterns.length; i++) {
    var match = url.match(patterns[i]);
    if (match) return match[1];
  }
  return null;
}

async function fetchYouTubeTranscript(videoId) {
  try {
    // Fetch the video page to get innertube data
    var pageResp = await fetch('https://www.youtube.com/watch?v=' + videoId, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    if (!pageResp.ok) return { transcript: null, error: 'Failed to fetch video page' };

    var html = await pageResp.text();

    // Extract video title
    var title = '';
    var titleMatch = html.match(/"title":"([^"]+)"/);
    if (titleMatch) title = titleMatch[1];

    // Try to get captions from the page
    var captionsMatch = html.match(/"captions":\s*(\{[^}]+?"playerCaptionsTracklistRenderer"[^}]+?\})/);
    if (!captionsMatch) {
      // Try alternate pattern
      captionsMatch = html.match(/"captionTracks":\s*(\[[^\]]+\])/);
    }

    if (!captionsMatch) {
      return { transcript: null, title: title, error: 'No captions available for this video' };
    }

    // Find the captions URL
    var captionUrlMatch = html.match(/"baseUrl":"(https:\/\/www\.youtube\.com\/api\/timedtext[^"]+)"/);
    if (!captionUrlMatch) {
      return { transcript: null, title: title, error: 'Could not find caption URL' };
    }

    var captionUrl = captionUrlMatch[1].replace(/\\u0026/g, '&');

    // Fetch captions XML
    var captionResp = await fetch(captionUrl);
    if (!captionResp.ok) {
      return { transcript: null, title: title, error: 'Failed to fetch captions' };
    }

    var captionXml = await captionResp.text();

    // Parse XML captions to plain text
    var transcript = captionXml
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n+/g, ' ')
      .trim();

    return { transcript: transcript, title: title };

  } catch (e) {
    return { transcript: null, error: e.message };
  }
}
