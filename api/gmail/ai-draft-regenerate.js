/**
 * POST /api/gmail/ai-draft-regenerate
 * Regenerate an AI draft with optional custom prompt.
 * Body: { id, custom_prompt? }
 */
const { getServiceClient, verifyUserToken, cors, getCredentials } = require('../_lib/supabase');
const { refreshGmailToken } = require('../_lib/gmail-auth');
const { generateDraft } = require('../_lib/draft-engine');

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  var userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    var body = req.body || {};
    if (!body.id) return res.status(400).json({ error: 'Missing draft id' });

    var client = getServiceClient();

    /* Load existing draft */
    var draftRes = await client.from('ai_email_drafts')
      .select('*')
      .eq('id', body.id)
      .eq('user_id', userId)
      .single();
    if (draftRes.error || !draftRes.data) return res.status(404).json({ error: 'Draft not found' });
    var draft = draftRes.data;

    /* Get Gmail access for thread fetch */
    var credRow = await getCredentials(userId, 'gmail');
    if (!credRow) return res.status(400).json({ error: 'Gmail not connected' });
    var accessToken = await refreshGmailToken(credRow);

    /* Fetch full thread */
    var threadResp = await fetch(
      GMAIL_API + '/threads/' + draft.thread_id + '?format=full',
      { headers: { 'Authorization': 'Bearer ' + accessToken } }
    );
    if (!threadResp.ok) throw new Error('Failed to fetch thread');
    var threadData = await threadResp.json();

    /* Parse messages */
    var parsedMessages = (threadData.messages || []).map(function(msg) {
      var getHeader = function(name) {
        var h = (msg.payload && msg.payload.headers || []).find(function(hdr) {
          return hdr.name.toLowerCase() === name.toLowerCase();
        });
        return h ? h.value : '';
      };
      return {
        from: getHeader('From'),
        fromName: extractName(getHeader('From')),
        date: new Date(parseInt(msg.internalDate)).toISOString(),
        body: extractBody(msg.payload)
      };
    });

    /* Build CRM context */
    var crmContext = null;
    if (draft.client_id || draft.campaign_id || draft.opportunity_id) {
      crmContext = {};
      if (draft.client_id) {
        var clRes = await client.from('clients').select('name').eq('id', draft.client_id).single();
        if (clRes.data) crmContext.clientName = clRes.data.name;
      }
      if (draft.end_client) crmContext.endClientName = draft.end_client;
      if (draft.campaign_id) {
        var cpRes = await client.from('campaigns').select('name,status').eq('id', draft.campaign_id).single();
        if (cpRes.data) { crmContext.campaignName = cpRes.data.name; crmContext.campaignStatus = cpRes.data.status; }
      }
      if (draft.opportunity_id) {
        var opRes = await client.from('opportunities').select('name,stage').eq('id', draft.opportunity_id).single();
        if (opRes.data) { crmContext.opportunityName = opRes.data.name; crmContext.opportunityStage = opRes.data.stage; }
      }
    }

    /* Run RAG pipeline */
    var result = await generateDraft({
      userId: userId,
      client: client,
      messages: parsedMessages,
      subject: draft.subject || '',
      clientId: draft.client_id,
      customPrompt: body.custom_prompt || '',
      crmContext: crmContext,
      isBatchDraft: true
    });

    /* Update draft */
    var updateRes = await client.from('ai_email_drafts')
      .update({
        body_html: result.draft,
        body_text: result.draft.replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').trim(),
        kb_chunks_used: result.chunks_searched,
        kb_sources: JSON.stringify(result.kb_sources),
        ai_model: result.ai_model,
        custom_prompt: body.custom_prompt || null,
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', body.id)
      .select()
      .single();

    if (updateRes.error) throw updateRes.error;
    return res.status(200).json(updateRes.data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

function extractName(fromRaw) {
  if (!fromRaw) return '';
  var match = fromRaw.match(/^(.+?)\s*<(.+?)>$/);
  return match ? match[1].replace(/"/g, '').trim() : fromRaw.trim();
}

function extractBody(payload) {
  if (!payload) return '';
  if (payload.body && payload.body.data) {
    return Buffer.from(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
  }
  var parts = payload.parts || [];
  var htmlBody = '', textBody = '';
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].mimeType === 'text/html' && parts[i].body && parts[i].body.data) {
      htmlBody = Buffer.from(parts[i].body.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
    } else if (parts[i].mimeType === 'text/plain' && parts[i].body && parts[i].body.data) {
      textBody = Buffer.from(parts[i].body.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
    } else if (parts[i].parts) {
      var nested = extractBody(parts[i]);
      if (nested && !htmlBody) htmlBody = nested;
    }
  }
  return htmlBody || textBody;
}
