const { verifyUserToken, getCredentials, cors } = require('../_lib/supabase');

const INSTANTLY_BASE = 'https://api.instantly.ai/api/v2';

/**
 * GET /api/instantly/unread
 * Lightweight endpoint — returns unread email count from Instantly API
 */
module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const credRow = await getCredentials(userId, 'instantly');
  if (!credRow || !credRow.credentials || !credRow.credentials.api_key) {
    return res.status(400).json({ error: 'Instantly not connected.' });
  }

  const headers = { 'Authorization': 'Bearer ' + credRow.credentials.api_key, 'Content-Type': 'application/json' };

  try {
    const resp = await fetch(INSTANTLY_BASE + '/emails/unread/count', { headers: headers });
    if (!resp.ok) {
      let body = '';
      try { body = await resp.text(); } catch (e) { /* ignore */ }
      return res.status(resp.status).json({ error: 'Instantly API error: ' + body.substring(0, 300) });
    }

    let result = {};
    try {
      const text = await resp.text();
      if (text && text.trim()) result = JSON.parse(text);
    } catch (e) { /* empty response */ }

    const count = result.count || result.unread_count || result.total || 0;
    return res.status(200).json({ ok: true, count: count });
  } catch (e) {
    console.error('unread count error:', e);
    return res.status(500).json({ error: e.message });
  }
};
