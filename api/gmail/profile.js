const { verifyUserToken, cors, getCredentials } = require('../_lib/supabase');
const { refreshGmailToken } = require('../_lib/gmail-auth');

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

/**
 * GET /api/gmail/profile
 * Returns the authenticated user's Gmail email address.
 */
module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const credRow = await getCredentials(userId, 'gmail');
    if (!credRow) return res.status(400).json({ error: 'Gmail not connected' });

    const accessToken = await refreshGmailToken(credRow);

    const profileResp = await fetch(GMAIL_API + '/profile', {
      headers: { 'Authorization': 'Bearer ' + accessToken }
    });
    if (!profileResp.ok) {
      const err = await profileResp.text();
      throw new Error('Gmail API ' + profileResp.status + ': ' + err.substring(0, 200));
    }
    const profile = await profileResp.json();
    return res.status(200).json({ email: profile.emailAddress || '' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
