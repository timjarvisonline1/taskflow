const { getServiceClient, verifyUserToken, getCredentials, cors } = require('../_lib/supabase');
const Anthropic = require('@anthropic-ai/sdk');

/**
 * POST /api/instantly/analyze
 * AI-analyzes inbound reply emails from Instantly campaigns.
 * Body: { emails: [{id, fromEmail, toEmail, subject, body, bodyText, leadName, companyName, campaignName}] }
 */
module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { emails } = req.body || {};
  if (!emails || !emails.length) return res.status(200).json({ results: [] });

  const credRow = await getCredentials(userId, 'anthropic');
  if (!credRow || !credRow.credentials || !credRow.credentials.api_key) {
    return res.status(400).json({ error: 'Anthropic API key not configured.' });
  }

  const model = (credRow.config && credRow.config.model) || 'claude-sonnet-4-6';
  const anthropic = new Anthropic({ apiKey: credRow.credentials.api_key });
  const client = getServiceClient();

  try {
    const emailList = emails.map(function(e, idx) {
      return (idx + 1) + '. Email ID: ' + e.id +
        '\n   From: ' + (e.fromEmail || '') +
        '\n   Lead: ' + (e.leadName || 'Unknown') + ' at ' + (e.companyName || 'Unknown Company') +
        '\n   Campaign: ' + (e.campaignName || 'Unknown') +
        '\n   Subject: ' + (e.subject || '(no subject)') +
        '\n   Body: ' + (e.bodyText || e.body || '').substring(0, 500);
    }).join('\n\n');

    const systemPrompt = `You are an outreach reply analyst for Tim Jarvis, who runs cold email campaigns via Instantly.ai for his consulting and production businesses.

Analyze each inbound reply and return ONLY a valid JSON array with one object per email, in the same order as input. Each object must have:
- email_id (string: the Email ID from input)
- sentiment (string: one of "positive", "negative", "question", "not_interested", "ooo", "bounce", "referral")
- summary (string: 1 concise sentence summarizing the reply)
- interest (string: "positive", "neutral", or "negative")
- suggested_action (string: one of "create_opportunity", "reply", "follow_up", "dismiss")
- key_info (string: any key details like name/title corrections, specific interest areas, referral contacts, etc.)

Sentiment guide:
- "positive": Interested in learning more, wants to meet, asks about services
- "negative": Rude, hostile, explicit rejection
- "not_interested": Polite decline, "not a good fit", "no budget"
- "question": Asks clarifying questions before committing
- "ooo": Out of office auto-reply
- "bounce": Delivery failure, invalid email
- "referral": Suggests someone else to contact

Action guide:
- "create_opportunity": Strong positive interest, wants to meet or discuss services
- "reply": Needs a response (question, mild interest, referral)
- "follow_up": Soft interest, schedule a follow-up later
- "dismiss": OOO, bounce, clear rejection — no action needed`;

    const resp = await anthropic.messages.create({
      model: model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: 'Analyze these cold email replies:\n\n' + emailList }]
    });

    const text = (resp.content[0] && resp.content[0].text) || '[]';
    let results = [];
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) results = JSON.parse(jsonMatch[0]);
    } catch (e) { console.error('JSON parse error:', e.message); }

    // Update database with analysis results
    const now = new Date().toISOString();
    for (const r of results) {
      if (!r.email_id) continue;
      await client.from('instantly_emails').update({
        ai_sentiment: r.sentiment || '',
        ai_summary: r.summary || '',
        ai_interest: r.interest || '',
        ai_suggested_action: r.suggested_action || '',
        ai_key_info: r.key_info || '',
        ai_analyzed_at: now
      }).eq('id', r.email_id).eq('user_id', userId);
    }

    return res.status(200).json({ success: true, results: results, analyzed: results.length });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
