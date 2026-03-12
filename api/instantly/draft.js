/**
 * POST /api/instantly/draft
 * Generates an AI-drafted reply for an Instantly cold email reply.
 * Uses RAG context from knowledge base + lead/campaign info.
 *
 * Body: {
 *   emailId: uuid (instantly_emails.id),
 *   threadEmails: [{from, to, subject, body, direction, timestamp}],
 *   leadName: string,
 *   companyName: string,
 *   campaignName: string,
 *   campaignDescription: string,
 *   clientId: uuid | null
 * }
 *
 * Returns: { draft: "html string", sources: [] }
 */

const { getServiceClient, verifyUserToken, cors, getCredentials } = require('../_lib/supabase');
const { getOpenAIKey, embedTexts, searchKnowledge } = require('../_lib/embeddings');
const Anthropic = require('@anthropic-ai/sdk');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const body = req.body || {};
    const threadEmails = body.threadEmails || [];
    const leadName = body.leadName || 'the lead';
    const companyName = body.companyName || '';
    const campaignName = body.campaignName || '';
    const clientId = body.clientId || null;

    // Get API keys
    const openaiKey = await getOpenAIKey(userId);
    const anthropicCred = await getCredentials(userId, 'anthropic');
    if (!anthropicCred || !anthropicCred.credentials || !anthropicCred.credentials.api_key) {
      return res.status(400).json({ error: 'Anthropic API key not configured' });
    }
    const model = (anthropicCred.config && anthropicCred.config.model) || 'claude-sonnet-4-6';
    const anthropic = new Anthropic({ apiKey: anthropicCred.credentials.api_key });

    function stripHtml(html) {
      if (!html) return '';
      return html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').trim();
    }

    // Build thread text for embedding query
    const lastReply = threadEmails.filter(e => e.direction === 'inbound').slice(-1)[0];
    const queryText = lastReply
      ? stripHtml(lastReply.body).substring(0, 400)
      : threadEmails.map(e => stripHtml(e.body)).join('\n').substring(0, 400);

    // RAG: search knowledge base for relevant context
    let kbContext = '';
    let sources = [];
    if (openaiKey && queryText) {
      try {
        const searchQuery = (companyName ? companyName + ' ' : '') + queryText.substring(0, 200);
        const embedResult = await embedTexts(openaiKey, [searchQuery]);
        if (embedResult && embedResult[0]) {
          const chunks = await searchKnowledge(userId, embedResult[0], 8, 0.3, null, clientId);
          if (chunks && chunks.length) {
            kbContext = '\n\nRelevant knowledge base context:\n' +
              chunks.map(c => '---\n[' + c.source_type + '] ' + (c.title || '') + '\n' + (c.content || '').substring(0, 400)).join('\n');
            sources = chunks.map(c => ({ title: c.title, sourceType: c.source_type, similarity: c.similarity }));
          }
        }
      } catch (e) { console.error('KB search error:', e.message); }
    }

    // Build thread context
    const threadText = threadEmails.map(function(e) {
      const dir = e.direction === 'inbound' ? 'FROM LEAD' : 'FROM YOU';
      return '--- ' + dir + ' (' + (e.timestamp || '') + ') ---\n' + stripHtml(e.body);
    }).join('\n\n');

    const systemPrompt = `You are drafting a cold email reply on behalf of Tim Jarvis. Tim runs two businesses:
- Tim Jarvis Online LLC: Business consulting, training, and speaking
- Film&Content LLC: Video production, content strategy, and digital advertising

Guidelines for the reply:
- Be concise and professional — 2-4 short paragraphs max
- Match the lead's tone — if they're casual, be casual; if formal, stay formal
- Don't be salesy or pushy — be helpful and genuine
- Reference specifics from their reply to show you read it
- If they asked a question, answer it directly
- If they're interested, suggest a brief call (15-20 min)
- Sign off naturally (no "Best regards" etc — use "Tim" or "Thanks, Tim")
- Write in HTML format using <p> tags for paragraphs
- Do NOT include subject lines or email headers — just the reply body` + kbContext;

    const userMessage = 'Lead: ' + leadName + (companyName ? ' at ' + companyName : '') +
      '\nCampaign: ' + campaignName +
      '\n\nEmail thread:\n' + threadText +
      '\n\nDraft a reply to the lead\'s most recent message.';

    const resp = await anthropic.messages.create({
      model: model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    });

    const draft = (resp.content[0] && resp.content[0].text) || '';

    return res.status(200).json({ success: true, draft: draft, sources: sources });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
