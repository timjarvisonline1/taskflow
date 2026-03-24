/**
 * POST /api/gmail/trigger-batch-draft
 * Trigger the batch draft generation from the client.
 * Auth: Supabase JWT (not CRON_SECRET).
 * Delegates to the batch-draft handler with the user's auth context.
 */
const { verifyUserToken, cors } = require('../_lib/supabase');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  var userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  /* Forward to batch-draft handler with the original auth header */
  try {
    var batchHandler = require('../cron/batch-draft');
    await batchHandler(req, res);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
