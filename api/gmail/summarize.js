const { getServiceClient, verifyUserToken, getCredentials, cors } = require('../_lib/supabase');
const { refreshGmailToken } = require('../_lib/gmail-auth');
const Anthropic = require('@anthropic-ai/sdk');

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { threadId } = req.body || {};
  if (!threadId) return res.status(400).json({ error: 'Missing threadId' });

  const client = getServiceClient();

  // Check cache first
  const { data: cached } = await client
    .from('gmail_threads')
    .select('full_summary, full_summary_at')
    .eq('user_id', userId)
    .eq('thread_id', threadId)
    .single();

  if (cached && cached.full_summary) {
    return res.status(200).json({ summary: cached.full_summary, cached: true });
  }

  // Fetch full thread from Gmail
  const gmailCred = await getCredentials(userId, 'gmail');
  if (!gmailCred) return res.status(400).json({ error: 'Gmail not connected' });
  const accessToken = await refreshGmailToken(gmailCred);

  const threadResp = await fetch(
    GMAIL_API + '/threads/' + threadId + '?format=full',
    { headers: { 'Authorization': 'Bearer ' + accessToken } }
  );
  if (!threadResp.ok) throw new Error('Gmail API ' + threadResp.status);
  const threadData = await threadResp.json();

  // Extract text bodies
  const messages = (threadData.messages || []).map(function(msg) {
    const getHeader = function(name) {
      var h = (msg.payload && msg.payload.headers || []).find(function(h) {
        return h.name.toLowerCase() === name.toLowerCase();
      });
      return h ? h.value : '';
    };
    var body = extractTextBody(msg.payload);
    return {
      from: getHeader('From'),
      date: new Date(parseInt(msg.internalDate)).toISOString(),
      body: body.substring(0, 3000)
    };
  });

  // Load Anthropic credentials
  const anthropicCred = await getCredentials(userId, 'anthropic');
  if (!anthropicCred || !anthropicCred.credentials || !anthropicCred.credentials.api_key) {
    return res.status(400).json({ error: 'Anthropic API key not configured' });
  }
  const model = (anthropicCred.config && anthropicCred.config.model) || 'claude-sonnet-4-6';
  const anthropic = new Anthropic({ apiKey: anthropicCred.credentials.api_key });

  const messageText = messages.map(function(m, i) {
    return 'Message ' + (i + 1) + ' from ' + m.from + ' (' + m.date + '):\n' + m.body;
  }).join('\n\n---\n\n');

  const response = await anthropic.messages.create({
    model: model,
    max_tokens: 1024,
    messages: [{ role: 'user', content:
      'Summarize this email thread conversation concisely. Include:\n' +
      '- Key topics discussed\n- Decisions made\n- Action items identified\n' +
      '- Current status / where things stand\n\nKeep to 3-5 bullet points.\n\n' + messageText
    }]
  });

  const summary = response.content[0].text.trim();

  // Cache result
  await client.from('gmail_threads').update({
    full_summary: summary,
    full_summary_at: new Date().toISOString()
  }).eq('user_id', userId).eq('thread_id', threadId);

  return res.status(200).json({ summary: summary, cached: false });
};

/* Extract plain text from message payload */
function extractTextBody(payload) {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body && payload.body.data) {
    return decodeBase64Url(payload.body.data);
  }
  var parts = payload.parts || [];
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].mimeType === 'text/plain' && parts[i].body && parts[i].body.data) {
      return decodeBase64Url(parts[i].body.data);
    }
    if (parts[i].parts) {
      var nested = extractTextBody(parts[i]);
      if (nested) return nested;
    }
  }
  // Fallback: strip HTML tags
  for (var j = 0; j < parts.length; j++) {
    if (parts[j].mimeType === 'text/html' && parts[j].body && parts[j].body.data) {
      return decodeBase64Url(parts[j].body.data).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
  }
  return '';
}

function decodeBase64Url(data) {
  var base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}
