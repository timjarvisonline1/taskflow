const { verifyUserToken, cors, getCredentials } = require('../_lib/supabase');

const INSTANTLY_BASE = 'https://api.instantly.ai/api/v2';

/**
 * POST /api/instantly/reply
 * Sends a reply to an email via the Instantly API.
 * Body: { emailInstantlyId, replyBody, fromAccount }
 */
module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const credRow = await getCredentials(userId, 'instantly');
    if (!credRow) return res.status(400).json({ error: 'Instantly not connected' });

    const apiKey = credRow.credentials ? credRow.credentials.api_key : null;
    if (!apiKey) return res.status(400).json({ error: 'Instantly API key missing' });

    const { emailInstantlyId, replyBody, fromAccount, subject } = req.body || {};
    if (!emailInstantlyId) return res.status(400).json({ error: 'Missing emailInstantlyId' });
    if (!replyBody) return res.status(400).json({ error: 'Missing reply body' });

    const headers = { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' };

    // Send reply via Instantly API
    const replyResp = await fetch(INSTANTLY_BASE + '/emails/reply', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        reply_to_uuid: emailInstantlyId,
        eaccount: fromAccount || undefined,
        subject: subject || undefined,
        body: {
          html: replyBody,
          text: replyBody.replace(/<[^>]*>/g, '')
        }
      })
    });

    if (!replyResp.ok) {
      const err = await replyResp.text();
      throw new Error('Instantly reply failed (' + replyResp.status + '): ' + err.substring(0, 200));
    }

    const result = await replyResp.json();
    return res.status(200).json({ success: true, result: result });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
