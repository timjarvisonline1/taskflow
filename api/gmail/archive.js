const { verifyUserToken, cors, getCredentials } = require('../_lib/supabase');
const { refreshGmailToken } = require('../_lib/gmail-auth');

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

/**
 * POST /api/gmail/archive
 * Archives a Gmail thread by removing the INBOX label.
 * Body: { threadId }
 */
module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { threadId } = req.body || {};
  if (!threadId) return res.status(400).json({ error: 'Missing threadId' });

  try {
    const credRow = await getCredentials(userId, 'gmail');
    if (!credRow) return res.status(400).json({ error: 'Gmail not connected' });

    const accessToken = await refreshGmailToken(credRow);

    const resp = await fetch(GMAIL_API + '/threads/' + threadId + '/modify', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ removeLabelIds: ['INBOX'] })
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error('Gmail archive failed (' + resp.status + '): ' + err.substring(0, 200));
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
