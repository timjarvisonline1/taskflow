const { verifyUserToken, getCredentials, cors } = require('../_lib/supabase');

const INSTANTLY_BASE = 'https://api.instantly.ai/api/v2';

/**
 * POST /api/instantly/account-action
 * Body: { email: "account@example.com", action: "warmup_enable"|"warmup_disable"|"pause"|"resume"|"mark_fixed"|"test_vitals" }
 */
module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { email, action } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });

  const validActions = ['warmup_enable', 'warmup_disable', 'pause', 'resume', 'mark_fixed', 'test_vitals'];
  if (!validActions.includes(action)) {
    return res.status(400).json({ error: 'action must be one of: ' + validActions.join(', ') });
  }

  const credRow = await getCredentials(userId, 'instantly');
  if (!credRow || !credRow.credentials || !credRow.credentials.api_key) {
    return res.status(400).json({ error: 'Instantly not connected.' });
  }

  const headers = { 'Authorization': 'Bearer ' + credRow.credentials.api_key, 'Content-Type': 'application/json' };

  try {
    let url, body;

    switch (action) {
      case 'warmup_enable':
        url = INSTANTLY_BASE + '/accounts/warmup/enable';
        body = JSON.stringify({ email: email });
        break;
      case 'warmup_disable':
        url = INSTANTLY_BASE + '/accounts/warmup/disable';
        body = JSON.stringify({ email: email });
        break;
      case 'pause':
        url = INSTANTLY_BASE + '/accounts/' + encodeURIComponent(email) + '/pause';
        body = JSON.stringify({});
        break;
      case 'resume':
        url = INSTANTLY_BASE + '/accounts/' + encodeURIComponent(email) + '/resume';
        body = JSON.stringify({});
        break;
      case 'mark_fixed':
        url = INSTANTLY_BASE + '/accounts/' + encodeURIComponent(email) + '/mark-fixed';
        body = JSON.stringify({});
        break;
      case 'test_vitals':
        url = INSTANTLY_BASE + '/accounts/test/vitals';
        body = JSON.stringify({ email: email });
        break;
      default:
        return res.status(400).json({ error: 'Unknown action' });
    }

    const resp = await fetch(url, { method: 'POST', headers: headers, body: body });

    if (!resp.ok) {
      let errBody = '';
      try { errBody = await resp.text(); } catch (e) { /* ignore */ }
      return res.status(resp.status).json({ error: 'Instantly API error: ' + errBody.substring(0, 300) });
    }

    let result = {};
    try {
      const text = await resp.text();
      if (text && text.trim()) result = JSON.parse(text);
    } catch (e) { /* empty response is ok */ }

    return res.status(200).json({ ok: true, result: result });
  } catch (e) {
    console.error('account-action error:', e);
    return res.status(500).json({ error: e.message });
  }
};
