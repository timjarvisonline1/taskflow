const { getServiceClient } = require('../_lib/supabase');
const { processZohoPaymentWebhook } = require('../_lib/sync-zoho-payments');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    // Find the user who owns this Zoho Payments integration
    // Match by account_id in the event payload
    const client = getServiceClient();
    const eventAccountId = event.account_id || '';

    let userId = null;

    if (eventAccountId) {
      // Look up by account_id in config
      const { data: creds } = await client
        .from('integration_credentials')
        .select('user_id, config')
        .eq('platform', 'zoho_payments')
        .eq('is_active', true);

      if (creds) {
        const match = creds.find(c => (c.config || {}).account_id === eventAccountId);
        if (match) userId = match.user_id;
      }
    }

    // Fallback for single-user system
    if (!userId) {
      const { data: creds } = await client
        .from('integration_credentials')
        .select('user_id')
        .eq('platform', 'zoho_payments')
        .eq('is_active', true)
        .limit(1);

      if (creds && creds.length > 0) userId = creds[0].user_id;
    }

    if (!userId) {
      return res.status(200).json({ status: 'no_user_found' });
    }

    // Process the webhook event
    const result = await processZohoPaymentWebhook(userId, event);
    return res.status(200).json({ status: 'ok', result });
  } catch (e) {
    console.error('Zoho Payments webhook error:', e);
    return res.status(200).json({ status: 'error', error: e.message });
  }
};
