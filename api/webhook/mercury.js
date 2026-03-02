const crypto = require('crypto');
const { getServiceClient } = require('../_lib/supabase');
const { processMercuryWebhook } = require('../_lib/sync-mercury');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const signature = req.headers['mercury-signature'] || '';
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    // Look up the user by matching account info in the webhook event
    // Mercury includes resourceId — we need to find which user owns this integration
    const client = getServiceClient();
    const { data: creds } = await client
      .from('integration_credentials')
      .select('user_id, config')
      .eq('platform', 'mercury')
      .eq('is_active', true);

    if (!creds || creds.length === 0) {
      return res.status(200).json({ status: 'no_mercury_users' });
    }

    // For single-user system, use the first (only) mercury credential
    // In a multi-user system, we'd match by account_id in the webhook payload
    const userId = creds[0].user_id;
    const webhookSecret = (creds[0].config || {}).webhook_secret;

    // Verify signature if webhook_secret is configured
    if (webhookSecret && signature) {
      const parts = {};
      signature.split(',').forEach(p => {
        const [k, v] = p.split('=');
        parts[k] = v;
      });

      const timestamp = parts.t;
      const sig = parts.v1;

      if (timestamp && sig) {
        const payload = timestamp + '.' + body;
        const expected = crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex');
        if (sig !== expected) {
          return res.status(401).json({ error: 'Invalid signature' });
        }

        // Reject timestamps older than 5 minutes (replay prevention)
        const tsMs = parseInt(timestamp) * 1000;
        if (Math.abs(Date.now() - tsMs) > 300000) {
          return res.status(401).json({ error: 'Timestamp too old' });
        }
      }
    }

    // Process the webhook event
    const result = await processMercuryWebhook(userId, event);
    return res.status(200).json({ status: 'ok', result });
  } catch (e) {
    console.error('Mercury webhook error:', e);
    return res.status(200).json({ status: 'error', error: e.message });
  }
};
