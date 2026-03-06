/**
 * POST /api/knowledge/ai-ask
 * ============================
 * General-purpose AI Q&A endpoint using RAG context.
 * Powers the contextual AI boxes throughout the app.
 *
 * 1. Embeds the question via OpenAI
 * 2. Vector-searches knowledge_chunks (client-scoped + broad)
 * 3. Builds a Claude prompt with entity context + knowledge + conversation history
 * 4. Returns the answer + sources
 *
 * Body: {
 *   question: string,
 *   context: {
 *     clientId: uuid | null,
 *     sourceTypes: string[] | null,
 *     entityContext: { type, name, data } | null,
 *     conversationHistory: [{ role, content }] | null
 *   }
 * }
 *
 * Returns: { answer: "html string", sources: [{title, type, similarity}], tokens }
 */

const { getServiceClient, verifyUserToken, cors, getCredentials } = require('../_lib/supabase');
const { getOpenAIKey, embedTexts, searchKnowledge } = require('../_lib/embeddings');
const Anthropic = require('@anthropic-ai/sdk');

var SOURCE_LABELS = {
  meeting: 'Meeting', email: 'Email', webpage: 'Web Page',
  youtube: 'YouTube', document: 'Document', task: 'Task',
  task_done: 'Completed Task', client: 'Client', campaign: 'Campaign',
  contact: 'Contact', project: 'Project', opportunity: 'Opportunity',
  activity_log: 'Activity', finance: 'Payment',
  scheduled_item: 'Recurring Item', team_member: 'Team'
};

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  var userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    var body = req.body || {};
    var question = (body.question || '').trim();
    var ctx = body.context || {};

    if (!question) {
      return res.status(400).json({ error: 'No question provided' });
    }

    // Get API keys
    var openaiKey = await getOpenAIKey(userId);
    if (!openaiKey) return res.status(400).json({ error: 'OpenAI API key not configured. Add it in Settings.' });

    var anthropicCred = await getCredentials(userId, 'anthropic');
    if (!anthropicCred || !anthropicCred.credentials || !anthropicCred.credentials.api_key) {
      return res.status(400).json({ error: 'Anthropic API key not configured. Add it in Settings.' });
    }
    var model = (anthropicCred.config && anthropicCred.config.model) || 'claude-sonnet-4-6';
    var anthropic = new Anthropic({ apiKey: anthropicCred.credentials.api_key });

    var client = getServiceClient();
    var clientId = ctx.clientId || null;
    var sourceTypes = ctx.sourceTypes || null;
    var entityContext = ctx.entityContext || null;
    var conversationHistory = ctx.conversationHistory || [];

    // Embed the question
    var queryEmbeddings = await embedTexts(openaiKey, [question]);
    var queryEmbedding = queryEmbeddings[0].embedding;

    // Multi-tier search: scoped first, then broaden, always run broad
    var results = [];
    var seenIds = {};

    function mergeResults(newResults) {
      newResults.forEach(function(r) {
        if (!seenIds[r.id]) { results.push(r); seenIds[r.id] = true; }
      });
    }

    // Tier 1: Client-scoped search
    if (clientId) {
      var clientResults = await searchKnowledge(client, userId, queryEmbedding, {
        clientId: clientId,
        limit: 15,
        threshold: 0.2
      });
      mergeResults(clientResults);
    }

    // Tier 2: Source-type filtered search (if specified)
    if (sourceTypes && sourceTypes.length > 0) {
      for (var st = 0; st < sourceTypes.length; st++) {
        var typeResults = await searchKnowledge(client, userId, queryEmbedding, {
          sourceType: sourceTypes[st],
          limit: 10,
          threshold: 0.2
        });
        mergeResults(typeResults);
      }
    }

    // Tier 3: Always run broad search to catch cross-cutting results
    var broadResults = await searchKnowledge(client, userId, queryEmbedding, {
      limit: 20,
      threshold: 0.18
    });
    mergeResults(broadResults);

    // Re-rank all results by similarity (best matches first)
    results.sort(function(a, b) { return b.similarity - a.similarity; });

    // Cap at 25
    results = results.slice(0, 25);

    // Build entity context string
    var entityStr = '';
    if (entityContext) {
      entityStr = '\nCURRENT VIEW: You are looking at ';
      if (entityContext.type === 'dashboard') {
        entityStr += 'the main dashboard.';
      } else if (entityContext.type === 'client') {
        entityStr += 'the client dashboard for ' + entityContext.name + '.';
      } else if (entityContext.type === 'campaign') {
        entityStr += 'the campaign "' + entityContext.name + '".';
      } else if (entityContext.type === 'opportunity') {
        entityStr += 'the opportunity "' + entityContext.name + '".';
      } else if (entityContext.type === 'sales_pipeline') {
        entityStr += 'the sales pipeline analytics view.';
      } else if (entityContext.type === 'project') {
        entityStr += 'the project "' + entityContext.name + '".';
      } else if (entityContext.type === 'finance') {
        entityStr += 'the finance overview.';
      } else {
        entityStr += entityContext.name + '.';
      }
      if (entityContext.data) {
        var dataPoints = [];
        Object.keys(entityContext.data).forEach(function(k) {
          var v = entityContext.data[k];
          if (v !== null && v !== undefined && v !== '') {
            dataPoints.push(k.replace(/([A-Z])/g, ' $1').toLowerCase() + ': ' + v);
          }
        });
        if (dataPoints.length > 0) {
          entityStr += '\nKey metrics: ' + dataPoints.join(', ') + '.';
        }
      }
      // Append structured live data (actual records from the app state)
      if (entityContext.liveData) {
        entityStr += '\n\n--- LIVE DATA FROM APP ---\n' + entityContext.liveData;
      }
    }

    // Build knowledge context
    var knowledgeContext = '';
    if (results.length > 0) {
      knowledgeContext = '\n\n--- RELEVANT CONTEXT FROM KNOWLEDGE BASE ---\n\n';
      knowledgeContext += results.map(function(r, i) {
        var label = SOURCE_LABELS[r.source_type] || 'Document';
        return '(' + (i + 1) + ') [' + label + '] ' + r.title + ' (relevance: ' + Math.round(r.similarity * 100) + '%)\n' + r.content.substring(0, 3000);
      }).join('\n\n');
    }

    // Build conversation history for follow-ups
    var historyStr = '';
    if (conversationHistory.length > 0) {
      historyStr = '\n\nPREVIOUS CONVERSATION:\n';
      conversationHistory.forEach(function(msg) {
        historyStr += (msg.role === 'user' ? 'User: ' : 'Assistant: ') + msg.content + '\n\n';
      });
    }

    // Build Claude messages
    var today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    var systemPrompt = `You are an AI assistant embedded in TaskFlow, a business management platform used by Tim Jarvis. Tim runs two businesses:
- Tim Jarvis Online LLC (consulting, training, speaking)
- Film&Content LLC (video production, content strategy, digital advertising)
${entityStr}

RULES:
- Never use em-dashes (--). Use commas, periods, or semicolons instead.
- Always write "Film&Content" with no spaces around the ampersand.
- Use US English spelling throughout.
- Be concise and direct. No filler phrases.
- Format responses with HTML tags: <p>, <ul>, <li>, <strong>, <em>. Never use markdown.
- If the knowledge base does not contain enough information, say so honestly and briefly.
- Reference specific sources when making claims (e.g. "Based on your meeting on Dec 15..." or "Your task notes indicate...").
- Current date: ${today}.
- Keep answers focused. For simple questions, keep it brief. For complex analyses, be thorough but organized.
- When listing items, use bullet points (<ul><li>) for clarity.`;

    var claudeMessages = [];

    // Add conversation history as messages
    for (var hi = 0; hi < conversationHistory.length; hi++) {
      claudeMessages.push({
        role: conversationHistory[hi].role,
        content: conversationHistory[hi].content
      });
    }

    // Add current question with knowledge context
    claudeMessages.push({
      role: 'user',
      content: question + knowledgeContext
    });

    // Call Claude
    var response = await anthropic.messages.create({
      model: model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: claudeMessages
    });

    var answer = response.content[0].text.trim();

    // Clean up code blocks if Claude added them
    answer = answer.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/g, '').trim();

    // Build sources list
    var sources = results.slice(0, 15).map(function(r) {
      return {
        title: r.title,
        type: SOURCE_LABELS[r.source_type] || 'Document',
        similarity: Math.round(r.similarity * 100)
      };
    });

    return res.status(200).json({
      answer: answer,
      sources: sources,
      tokens: (response.usage && response.usage.output_tokens) || 0
    });

  } catch (e) {
    console.error('ai-ask error:', e);
    return res.status(500).json({ error: e.message });
  }
};
