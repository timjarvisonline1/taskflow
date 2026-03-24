/**
 * GET /api/gmail/ai-drafts
 * List pending/edited AI drafts for the authenticated user.
 */
const { getServiceClient, verifyUserToken, cors } = require('../_lib/supabase');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  var userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    var client = getServiceClient();
    var result = await client.from('ai_email_drafts')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['pending', 'edited'])
      .order('created_at', { ascending: false });

    return res.status(200).json(result.data || []);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
