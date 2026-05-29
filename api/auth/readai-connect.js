const { verifyUserToken, cors, getCredentials, getServiceClient } = require('../_lib/supabase');
const { registerReadaiClient } = require('../_lib/readai-auth');

const SCOPES = 'openid email meeting:read offline_access profile';

/**
 * GET /api/auth/readai-connect
 * Returns the Read.ai OAuth URL. Auto-registers via dynamic client registration
 * if no client_id exists yet — no manual credentials needed.
 */
module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const redirectUri = protocol + '://' + host + '/api/auth/readai-callback';

    const client = getServiceClient();
    let credRow = await getCredentials(userId, 'readai');
    let creds = credRow ? credRow.credentials || {} : {};

    // Create credential row if none exists (user may only have webhook config, or nothing)
    if (!credRow) {
      const { data, error } = await client
        .from('integration_credentials')
        .insert({ user_id: userId, platform: 'readai', credentials: {}, config: {}, is_active: false })
        .select('*')
        .single();
      if (error) throw new Error('Failed to create readai credential row: ' + error.message);
      credRow = data;
      creds = {};
    }

    // Dynamic client registration if no client_id yet
    if (!creds.client_id) {
      const registration = await registerReadaiClient(redirectUri);
      creds.client_id = registration.client_id;
      creds.client_secret = registration.client_secret;

      await client
        .from('integration_credentials')
        .update({ credentials: creds, updated_at: new Date().toISOString() })
        .eq('id', credRow.id);
    }

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
