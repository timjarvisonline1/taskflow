const { verifyUserToken, cors, getServiceClient, getCredentials } = require('../_lib/supabase');
const { exchangeGmailCode } = require('../_lib/gmail-auth');

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify'
].join(' ');

/**
 * Catch-all handler for /api/auth/:handler
 * Dispatches to gmail-connect or gmail-callback.
 */
module.exports = async function handler(req, res) {
  const action = req.query.handler;

  if (action === 'gmail-connect') return handleConnect(req, res);
  if (action === 'gmail-callback') return handleCallback(req, res);

  return res.status(404).json({ error: 'Unknown auth handler: ' + action });
};

/* ═══════════ GMAIL CONNECT ═══════════ */
async function handleConnect(req, res) {
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
}

/* ═══════════ GMAIL CALLBACK ═══════════ */
async function handleCallback(req, res) {
  // No CORS needed — this is a redirect target, not an API call
  if (req.method !== 'GET') return res.status(405).send('GET only');

  const code = req.query.code;
  const userId = req.query.state;
  const error = req.query.error;

  if (error) {
    return res.status(200).send(errorPage('Authorization denied: ' + error));
  }

  if (!code || !userId) {
    return res.status(400).send(errorPage('Missing code or state parameter'));
  }

  try {
    const credRow = await getCredentials(userId, 'gmail');
    if (!credRow) {
      return res.status(400).send(errorPage('Gmail credentials not found. Save your Client ID and Secret first.'));
    }

    const creds = credRow.credentials || {};
    if (!creds.client_id || !creds.client_secret) {
      return res.status(400).send(errorPage('Client ID and Client Secret must be saved before connecting.'));
    }

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const redirectUri = protocol + '://' + host + '/api/auth/gmail-callback';

    const tokens = await exchangeGmailCode(creds.client_id, creds.client_secret, code, redirectUri);

    const newCreds = {
      ...creds,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: tokens.token_expires_at
    };

    const client = getServiceClient();
    await client
      .from('integration_credentials')
      .update({
        credentials: newCreds,
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', credRow.id);

    return res.status(200).send(successPage());
  } catch (e) {
    return res.status(200).send(errorPage(e.message));
  }
}

function successPage() {
  return `<!DOCTYPE html><html><head><title>Gmail Connected</title>
<style>body{font-family:-apple-system,system-ui,sans-serif;background:#0d0d0f;color:#e5e7eb;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
.box{text-align:center;padding:40px;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)}
h1{color:#10b981;font-size:24px;margin-bottom:8px}p{color:#9ca3af;font-size:14px}</style></head>
<body><div class="box"><h1>Gmail Connected</h1><p>You can close this tab and return to TaskFlow.</p>
<p style="margin-top:16px;font-size:12px;color:#6b7280">This window will close automatically...</p></div>
<script>if(window.opener){window.opener.postMessage('gmail-connected','*')}setTimeout(function(){window.close()},2000)</script></body></html>`;
}

function errorPage(msg) {
  return `<!DOCTYPE html><html><head><title>Gmail Connection Failed</title>
<style>body{font-family:-apple-system,system-ui,sans-serif;background:#0d0d0f;color:#e5e7eb;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
.box{text-align:center;padding:40px;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);max-width:400px}
h1{color:#ef4444;font-size:24px;margin-bottom:8px}p{color:#9ca3af;font-size:14px}.err{color:#f87171;font-size:12px;margin-top:12px;word-break:break-all}</style></head>
<body><div class="box"><h1>Connection Failed</h1><p>Something went wrong connecting Gmail.</p>
<div class="err">${msg.replace(/</g, '&lt;')}</div>
<p style="margin-top:16px"><a href="javascript:window.close()" style="color:#60a5fa">Close this tab</a></p></div></body></html>`;
}
