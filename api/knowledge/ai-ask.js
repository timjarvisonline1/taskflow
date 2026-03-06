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

    // Multi-tier search: vector + keyword
    var results = [];
    var seenIds = {};

    function mergeResults(newResults) {
      newResults.forEach(function(r) {
        if (!seenIds[r.id]) { results.push(r); seenIds[r.id] = true; }
      });
    }

    // ── KEYWORD SEARCH (finds exact name/term mentions) ──
    // Extract significant words (4+ chars, skip common words)
    var stopWords = ['what','when','where','which','about','their','there','these','those','should','would','could','have','been','from','with','this','that','your','will','they','them','were','than','then','into','some','more','most','also','each','does','doing','done','made','make','just','over','such','take','only','come','know','very','after','before','between','being','other','well','back','much','even','here','want','tell','give','find','need','like','look','help','show','list','name','think','going','really','still','first','last'];
    var keywords = question.toLowerCase().split(/\s+/).filter(function(w) {
      var clean = w.replace(/[^a-z0-9]/g, '');
      return clean.length >= 3 && stopWords.indexOf(clean) === -1;
    });
    // Also extract original-case words for proper nouns
    var originalWords = question.split(/\s+/).filter(function(w) {
      return w.length >= 3 && w.charAt(0) === w.charAt(0).toUpperCase() && w !== w.toUpperCase();
    });
    // Combine unique search terms (prefer original case for proper nouns)
    var searchTerms = [];
    var termsSeen = {};
    originalWords.concat(keywords).forEach(function(w) {
      var key = w.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (key.length >= 3 && !termsSeen[key]) { searchTerms.push(w.replace(/[^a-zA-Z0-9&-]/g, '')); termsSeen[key] = true; }
    });

    // Run keyword searches in parallel for top terms (max 5)
    var kwTerms = searchTerms.slice(0, 5);
    var kwPromises = kwTerms.map(function(term) {
      var q = client.from('knowledge_chunks')
        .select('id, source_type, source_id, title, content, client_id, date, people, tags')
        .eq('user_id', userId)
        .ilike('content', '%' + term + '%')
        .order('date', { ascending: false, nullsFirst: false })
        .limit(10);
      if (clientId) q = q.eq('client_id', clientId);
      return q;
    });

    // ── VECTOR SEARCH tiers (run in parallel with keyword search) ──
    var vectorPromises = [];

    // Tier 1: Client-scoped
    if (clientId) {
      vectorPromises.push(searchKnowledge(client, userId, queryEmbedding, {
        clientId: clientId, limit: 15, threshold: 0.2
      }));
    }
    // Tier 2: Source-type filtered
    if (sourceTypes && sourceTypes.length > 0) {
      for (var st = 0; st < sourceTypes.length; st++) {
        vectorPromises.push(searchKnowledge(client, userId, queryEmbedding, {
          sourceType: sourceTypes[st], limit: 10, threshold: 0.2
        }));
      }
    }
    // Tier 3: Broad
    vectorPromises.push(searchKnowledge(client, userId, queryEmbedding, {
      limit: 20, threshold: 0.18
    }));

    // Run all searches in parallel
    var allSearches = await Promise.all(kwPromises.concat(vectorPromises));

    // Merge keyword results (add similarity score for ranking)
    for (var ki = 0; ki < kwPromises.length; ki++) {
      var kwRes = allSearches[ki];
      if (kwRes.data && kwRes.data.length > 0) {
        var kwChunks = kwRes.data.map(function(r) {
          r.similarity = 0.85; // keyword matches get high base score
          return r;
        });
        mergeResults(kwChunks);
      }
    }
    // Merge vector results
    for (var vi = kwPromises.length; vi < allSearches.length; vi++) {
      mergeResults(allSearches[vi]);
    }

    // Re-rank: keyword matches first (0.85), then by vector similarity
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
