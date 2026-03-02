const { verifyUserToken, cors } = require('../_lib/supabase');
const { syncMercury } = require('../_lib/sync-mercury');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const stats = await syncMercury(userId);
    return res.status(200).json({ success: true, ...stats });
  } catch (e) {
    return res.status(200).json({ success: false, error: e.message });
  }
};
