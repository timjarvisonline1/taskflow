const { getServiceClient } = require('../_lib/supabase');
const { syncBrex } = require('../_lib/sync-brex');
const { syncMercury } = require('../_lib/sync-mercury');
const { syncZohoBooks } = require('../_lib/sync-zoho-books');

const SYNC_FNS = {
  brex: syncBrex,
  mercury: syncMercury,
  zoho_books: syncZohoBooks
};

module.exports = async function handler(req, res) {
  // Verify cron secret (Vercel sends this automatically for cron jobs)
  const authHeader = req.headers.authorization || '';
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== 'Bearer ' + cronSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const client = getServiceClient();
  const results = {};

  try {
    // Get all active integrations
    const { data: creds, error } = await client
      .from('integration_credentials')
      .select('user_id, platform')
      .eq('is_active', true);

    if (error || !creds || creds.length === 0) {
      return res.status(200).json({ message: 'No active integrations', results });
    }

    // Group by user (future-proofing for multi-user)
    const byUser = {};
    for (const c of creds) {
      if (!byUser[c.user_id]) byUser[c.user_id] = [];
      byUser[c.user_id].push(c.platform);
    }

    // Sync each user's integrations
    for (const [userId, platforms] of Object.entries(byUser)) {
      results[userId] = {};

      for (const platform of platforms) {
        const syncFn = SYNC_FNS[platform];
        if (!syncFn) continue;

        try {
          const stats = await syncFn(userId);
          results[userId][platform] = { success: true, ...stats };
        } catch (e) {
          results[userId][platform] = { success: false, error: e.message };
        }
      }
    }

    return res.status(200).json({ message: 'Sync complete', results });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
