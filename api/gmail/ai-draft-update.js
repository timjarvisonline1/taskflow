/**
 * POST /api/gmail/ai-draft-update
 * Update an AI draft (body, recipients, subject).
 * Body: { id, body_html?, to_addresses?, cc_addresses?, subject? }
 */
const { getServiceClient, verifyUserToken, cors } = require('../_lib/supabase');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  var userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    var body = req.body || {};
    if (!body.id) return res.status(400).json({ error: 'Missing draft id' });

    var updates = { status: 'edited', updated_at: new Date().toISOString() };
    if (body.body_html !== undefined) updates.body_html = body.body_html;
    if (body.to_addresses !== undefined) updates.to_addresses = body.to_addresses;
    if (body.cc_addresses !== undefined) updates.cc_addresses = body.cc_addresses;
    if (body.subject !== undefined) updates.subject = body.subject;

    var client = getServiceClient();
    var result = await client.from('ai_email_drafts')
      .update(updates)
      .eq('id', body.id)
      .eq('user_id', userId)
      .select()
      .single();

    if (result.error) throw result.error;
    return res.status(200).json(result.data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
