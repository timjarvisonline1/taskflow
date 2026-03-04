const { verifyUserToken, cors, getCredentials } = require('../_lib/supabase');

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify'
].join(' ');

/**
 * GET /api/auth/gmail-connect
 * Returns the Google OAuth URL for the user to authorize Gmail access.
 * Requires a valid Supabase JWT in the Authorization header.
 */
module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const credRow = await getCredentials(userId, 'gmail');
    const creds = credRow ? credRow.credentials || {} : {};
    const clientId = creds.client_id;

    if (!clientId) {
      return res.status(400).json({ error: 'Save your Client ID first in the integrations modal, then click Connect Gmail.' });
    }

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const redirectUri = protocol + '://' + host + '/api/auth/gmail-callback';

    const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state: userId
    }).toString();

    return res.status(200).json({ url: authUrl });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
