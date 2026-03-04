const { getServiceClient, getCredentials } = require('../_lib/supabase');
const { exchangeGmailCode } = require('../_lib/gmail-auth');

/**
 * GET /api/auth/gmail-callback
 * Handles the OAuth redirect from Google after user grants permission.
 * Exchanges code for tokens, stores them, returns success HTML.
 */
module.exports = async function handler(req, res) {
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
    // Get stored client_id and client_secret
    const credRow = await getCredentials(userId, 'gmail');
    if (!credRow) {
      return res.status(400).send(errorPage('Gmail credentials not found. Save your Client ID and Secret first.'));
    }

    const creds = credRow.credentials || {};
    if (!creds.client_id || !creds.client_secret) {
      return res.status(400).send(errorPage('Client ID and Client Secret must be saved before connecting.'));
    }

    // Build redirect URI (must match exactly what was used in gmail-connect)
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const redirectUri = protocol + '://' + host + '/api/auth/gmail-callback';

    // Exchange code for tokens
    const tokens = await exchangeGmailCode(creds.client_id, creds.client_secret, code, redirectUri);

    // Update stored credentials with tokens
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
};

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
