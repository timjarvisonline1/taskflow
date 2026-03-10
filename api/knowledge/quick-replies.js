/**
 * POST /api/knowledge/quick-replies
 * ===================================
 * Generates 2-3 short quick-reply suggestions for an email thread.
 * Lightweight: uses only subject + snippet + AI summary (no RAG, no full bodies).
 *
 * Body: { subject, snippet, aiSummary, fromName, sentiment }
 * Returns: { replies: ["Thanks, confirmed!", "I'll review and follow up.", ...] }
 */

const { verifyUserToken, cors, getCredentials } = require('../_lib/supabase');
const Anthropic = require('@anthropic-ai/sdk');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  var userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    var body = req.body || {};
    var subject = body.subject || '';
    var snippet = body.snippet || '';
    var aiSummary = body.aiSummary || '';
    var fromName = body.fromName || '';
    var sentiment = body.sentiment || 'neutral';

    if (!subject && !snippet) {
      return res.status(400).json({ error: 'No email context provided' });
    }

    var anthropicCred = await getCredentials(userId, 'anthropic');
    if (!anthropicCred || !anthropicCred.credentials || !anthropicCred.credentials.api_key) {
      return res.status(400).json({ error: 'Anthropic API key not configured' });
    }
    var model = (anthropicCred.config && anthropicCred.config.model) || 'claude-sonnet-4-6';
    var anthropic = new Anthropic({ apiKey: anthropicCred.credentials.api_key });

    var systemPrompt = `Generate exactly 3 short email quick-reply options for Tim Jarvis.
Rules:
- Each reply must be 1 sentence max (under 15 words).
- Write as Tim (first person).
- Never use em-dashes. Use commas or periods instead.
- Never suggest meetings or calls.
- Match the formality level to the email context.
- Return ONLY a JSON array of 3 strings. No markdown, no explanation.`;

    var userPrompt = `<email_content>
Subject: ${subject}
From: ${fromName}
${aiSummary ? 'Summary: ' + aiSummary : 'Snippet: ' + snippet}
Sentiment: ${sentiment}
</email_content>

Generate 3 quick replies.`;

    var response = await anthropic.messages.create({
      model: model,
      max_tokens: 256,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    var text = response.content[0].text.trim();
    var replies = [];
    try {
      var cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/g, '').trim();
      replies = JSON.parse(cleaned);
    } catch (e) {
      // Fallback: try to extract quoted strings
      var matches = text.match(/"([^"]+)"/g);
      if (matches) replies = matches.map(function(m) { return m.replace(/"/g, ''); });
    }

    if (!Array.isArray(replies)) replies = [];
    replies = replies.slice(0, 3).filter(function(r) { return typeof r === 'string' && r.length > 0; });

    return res.status(200).json({ replies: replies });
  } catch (e) {
    console.error('quick-replies error:', e);
    return res.status(500).json({ error: e.message });
  }
};
