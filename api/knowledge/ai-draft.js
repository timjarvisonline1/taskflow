/**
 * POST /api/knowledge/ai-draft
 * ==============================
 * Generates an AI-drafted email reply using RAG context.
 *
 * 1. Embeds the email context (latest message + subject)
 * 2. Vector-searches knowledge_chunks for relevant context
 * 3. Builds a Claude prompt with email thread + retrieved knowledge
 * 4. Returns the drafted reply
 *
 * Body: {
 *   threadId: string,
 *   messages: [{from, fromName, date, body}],
 *   subject: string,
 *   recipients: string,
 *   clientId: uuid | null
 * }
 *
 * Returns: { draft: "html string", sources: [{title, source_type, similarity}] }
 */

const { getServiceClient, verifyUserToken, cors, getCredentials } = require('../_lib/supabase');
const { getOpenAIKey, embedTexts, searchKnowledge } = require('../_lib/embeddings');
const Anthropic = require('@anthropic-ai/sdk');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  var userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    var body = req.body || {};
    var messages = body.messages || [];
    var subject = body.subject || '';
    var clientId = body.clientId || null;

    if (!messages.length) {
      return res.status(400).json({ error: 'No email messages provided' });
    }

    // Get API keys
    var openaiKey = await getOpenAIKey(userId);
    if (!openaiKey) return res.status(400).json({ error: 'OpenAI API key not configured. Add it in Settings.' });

    var anthropicCred = await getCredentials(userId, 'anthropic');
    if (!anthropicCred || !anthropicCred.credentials || !anthropicCred.credentials.api_key) {
      return res.status(400).json({ error: 'Anthropic API key not configured' });
    }
    var model = (anthropicCred.config && anthropicCred.config.model) || 'claude-sonnet-4-6';
    var anthropic = new Anthropic({ apiKey: anthropicCred.credentials.api_key });

    var client = getServiceClient();

    // Build query text from latest message + subject
    var latestMsg = messages[messages.length - 1];
    var queryText = subject + '\n\n' + (latestMsg.body || '').substring(0, 1500);

    // Embed query text
    var queryEmbeddings = await embedTexts(openaiKey, [queryText]);
    var queryEmbedding = queryEmbeddings[0].embedding;

    // Search knowledge base
    // First search with client filter if available, then broaden
    var results = [];
    if (clientId) {
      results = await searchKnowledge(client, userId, queryEmbedding, {
        clientId: clientId,
        limit: 10,
        threshold: 0.25
      });
    }

    // If not enough results with client filter, search broadly
    if (results.length < 8) {
      var broadResults = await searchKnowledge(client, userId, queryEmbedding, {
        limit: 15,
        threshold: 0.3
      });

      // Merge, avoiding duplicates
      var seenIds = {};
      results.forEach(function(r) { seenIds[r.id] = true; });
      broadResults.forEach(function(r) {
        if (!seenIds[r.id]) {
          results.push(r);
          seenIds[r.id] = true;
        }
      });

      // Cap at 15 total
      results = results.slice(0, 15);
    }

    // Build the email thread text
    var threadText = messages.map(function(m, i) {
      var fromLabel = m.fromName || m.from || 'Unknown';
      var dateLabel = m.date ? new Date(m.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
      return 'Message ' + (i + 1) + ' from ' + fromLabel + (dateLabel ? ' (' + dateLabel + ')' : '') + ':\n' + (m.body || '').substring(0, 3000);
    }).join('\n\n---\n\n');

    // Build knowledge context
    var knowledgeContext = '';
    if (results.length > 0) {
      knowledgeContext = '\n\n--- RELEVANT CONTEXT FROM KNOWLEDGE BASE ---\n\n';
      knowledgeContext += results.map(function(r, i) {
        var sourceLabel = r.source_type === 'meeting' ? 'Meeting' :
                         r.source_type === 'email' ? 'Email' :
                         r.source_type === 'webpage' ? 'Web Page' :
                         r.source_type === 'youtube' ? 'YouTube' : 'Document';
        return '(' + (i + 1) + ') [' + sourceLabel + '] ' + r.title + ' (relevance: ' + Math.round(r.similarity * 100) + '%)\n' + r.content.substring(0, 1500);
      }).join('\n\n');
    }

    // Build Claude prompt
    var prompt = `You are drafting an email reply for Tim Jarvis, who runs two businesses:
- Tim Jarvis Online LLC (consulting, training, speaking)
- Film&Content LLC (video production, content strategy, digital advertising)

IMPORTANT RULES:
- Never use em-dashes (--) in any text. Use commas, periods, or semicolons instead.
- Always write "Film&Content" with no spaces around the ampersand.
- Use US English spelling throughout.
- Never suggest or offer to jump on a call, have a meeting, or schedule a chat.
- Be professional, concise, and natural. Match Tim's tone from context.
- Write in first person as Tim.
- Do not include a subject line. Just the reply body.
- Format with HTML for the email editor (use <p>, <br>, <b>, <ul>, <li> tags as needed).
- Do not include greeting/closing unless contextually appropriate.
- Keep responses focused and direct. Avoid filler phrases.

EMAIL THREAD:
Subject: ${subject}

${threadText}
${knowledgeContext}

Draft a reply to the most recent message. If the knowledge base context contains relevant information (previous discussions, meeting notes, project details), weave it naturally into your response. Do not mention that you are using a knowledge base or AI.

Reply:`;

    // Call Claude
    var response = await anthropic.messages.create({
      model: model,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }]
    });

    var draft = response.content[0].text.trim();

    // Clean up if Claude wrapped in code blocks
    draft = draft.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/g, '').trim();

    // Build sources list for display
    var sources = results.slice(0, 8).map(function(r) {
      var sourceLabel = r.source_type === 'meeting' ? 'Meeting' :
                       r.source_type === 'email' ? 'Email' :
                       r.source_type === 'webpage' ? 'Web Page' :
                       r.source_type === 'youtube' ? 'YouTube' : 'Document';
      return {
        title: r.title,
        source_type: sourceLabel,
        similarity: Math.round(r.similarity * 100)
      };
    });

    return res.status(200).json({
      draft: draft,
      sources: sources,
      chunks_searched: results.length
    });

  } catch (e) {
    console.error('ai-draft error:', e);
    return res.status(500).json({ error: e.message });
  }
};
