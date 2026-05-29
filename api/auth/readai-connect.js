const { verifyUserToken, cors, getCredentials } = require('../_lib/supabase');

const SCOPES = 'openid email meeting:read offline_access profile';

/**
 * GET /api/auth/readai-connect
 * Returns the Read.ai OAuth URL for the user to authorize meeting access.
 * Requires client_id and client_secret already saved in integration_credentials.
 */
module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const credRow = await getCredentials(userId, 'readai');
    const creds = credRow ? credRow.credentials || {} : {};

    if (!creds.client_id) {
      return res.status(400).json({ error: 'Save your OAuth Client ID first in the integrations modal, then click Connect Read.ai.' });
    }

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const redirectUri = protocol + '://' + host + '/api/auth/readai-callback';

    const authUrl = 'https://authn.read.ai/oauth2/authorize?' + new URLSearchParams({
      client_id: creds.client_id,
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
