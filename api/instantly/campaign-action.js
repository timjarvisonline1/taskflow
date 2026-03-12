const { verifyUserToken, getCredentials, cors } = require('../_lib/supabase');

const INSTANTLY_BASE = 'https://api.instantly.ai/api/v2';

/**
 * POST /api/instantly/campaign-action
 * Body: { campaignId: "instantly-campaign-id", action: "activate"|"pause" }
 */
module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { campaignId, action } = req.body || {};
  if (!campaignId) return res.status(400).json({ error: 'campaignId required' });
  if (action !== 'activate' && action !== 'pause') return res.status(400).json({ error: 'action must be "activate" or "pause"' });

  const credRow = await getCredentials(userId, 'instantly');
  if (!credRow || !credRow.credentials || !credRow.credentials.api_key) {
    return res.status(400).json({ error: 'Instantly not connected.' });
  }

  const headers = { 'Authorization': 'Bearer ' + credRow.credentials.api_key, 'Content-Type': 'application/json' };

  try {
    const url = INSTANTLY_BASE + '/campaigns/' + encodeURIComponent(campaignId) + '/' + action;
    const resp = await fetch(url, { method: 'POST', headers: headers });

    if (!resp.ok) {
      let body = '';
      try { body = await resp.text(); } catch (e) { /* ignore */ }
      return res.status(resp.status).json({ error: 'Instantly API error: ' + body.substring(0, 300) });
    }

    let result = {};
    try {
      const text = await resp.text();
      if (text && text.trim()) result = JSON.parse(text);
    } catch (e) { /* empty response is ok */ }

    return res.status(200).json({ ok: true, result: result });
  } catch (e) {
    console.error('campaign-action error:', e);
    return res.status(500).json({ error: e.message });
  }
};
