const { verifyUserToken, getCredentials, getServiceClient, cors } = require('../_lib/supabase');

const INSTANTLY_BASE = 'https://api.instantly.ai/api/v2';

/**
 * POST /api/instantly/lead-action
 * Body: { leadEmail, campaignId, interestStatus }
 * Updates lead interest status on Instantly and in local DB
 */
module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { leadEmail, campaignId, interestStatus } = req.body || {};
  if (!leadEmail) return res.status(400).json({ error: 'leadEmail required' });
  if (interestStatus === undefined) return res.status(400).json({ error: 'interestStatus required' });

  const credRow = await getCredentials(userId, 'instantly');
  if (!credRow || !credRow.credentials || !credRow.credentials.api_key) {
    return res.status(400).json({ error: 'Instantly not connected.' });
  }

  const headers = { 'Authorization': 'Bearer ' + credRow.credentials.api_key, 'Content-Type': 'application/json' };

  try {
    // Update on Instantly API
    const body = { email: leadEmail, interest_status: interestStatus };
    if (campaignId) body.campaign_id = campaignId;

    const resp = await fetch(INSTANTLY_BASE + '/leads/update-interest-status', {
      method: 'POST', headers: headers,
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      let errBody = '';
      try { errBody = await resp.text(); } catch (e) { /* ignore */ }
      return res.status(resp.status).json({ error: 'Instantly API error: ' + errBody.substring(0, 300) });
    }

    // Update local DB
    const client = getServiceClient();
    if (campaignId) {
      // Find the lead by email and campaign
      const { data: leads } = await client
        .from('instantly_leads')
        .select('id')
        .eq('user_id', userId)
        .eq('email', leadEmail)
        .eq('campaign_id', campaignId)
        .limit(1);

      if (leads && leads.length) {
        await client.from('instantly_leads')
          .update({ interest_status: String(interestStatus) })
          .eq('id', leads[0].id);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('lead-action error:', e);
    return res.status(500).json({ error: e.message });
  }
};
