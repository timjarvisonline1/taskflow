/**
 * POST /api/gmail/ai-draft-discard
 * Discard an AI draft. Updates draft status and gmail_threads.
 * Body: { id }
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

    var client = getServiceClient();

    /* Load draft to get thread_id */
    var draftRes = await client.from('ai_email_drafts')
      .select('thread_id')
      .eq('id', body.id)
      .eq('user_id', userId)
      .single();
    if (draftRes.error || !draftRes.data) return res.status(404).json({ error: 'Draft not found' });

    /* Update draft */
    await client.from('ai_email_drafts')
      .update({ status: 'discarded', discarded_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', body.id);

    /* Update gmail_threads */
    await client.from('gmail_threads')
      .update({ reply_status: 'dismissed' })
      .eq('user_id', userId)
      .eq('thread_id', draftRes.data.thread_id);

    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
