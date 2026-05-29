const { getServiceClient } = require('./supabase');

const TOKEN_ENDPOINT = 'https://authn.read.ai/oauth2/token';
const REGISTER_ENDPOINT = 'https://api.read.ai/oauth/register';

function basicAuthHeader(clientId, clientSecret) {
  return 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64');
}

/**
 * Refresh a Read.ai OAuth access token if expired (or within 60s of expiry).
 * Read.ai tokens expire every 10 minutes and refresh tokens rotate on each use,
 * so the new refresh_token must be stored after every refresh.
 */
async function refreshReadaiToken(credentialRow) {
  const creds = credentialRow.credentials || {};
  const expiresAt = new Date(creds.token_expires_at || 0);

  if (expiresAt > new Date(Date.now() + 60000) && creds.access_token) {
    return creds.access_token;
  }

  if (!creds.refresh_token) {
    throw new Error('No refresh_token stored for Read.ai');
  }

  const params = new URLSearchParams({
    refresh_token: creds.refresh_token,
    grant_type: 'refresh_token'
  });

  const resp = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': basicAuthHeader(creds.client_id, creds.client_secret)
    },
    body: params
  });

  const data = await resp.json();
  if (data.error) {
    throw new Error('Read.ai token refresh failed: ' + (data.error_description || data.error));
  }

  const newCreds = {
    ...creds,
    access_token: data.access_token,
    token_expires_at: new Date(Date.now() + ((data.expires_in || 600) * 1000)).toISOString()
  };
  if (data.refresh_token) {
    newCreds.refresh_token = data.refresh_token;
  }

  const client = getServiceClient();
  await client
    .from('integration_credentials')
    .update({ credentials: newCreds, updated_at: new Date().toISOString() })
    .eq('id', credentialRow.id);

  return data.access_token;
}

/**
 * Exchange a Read.ai OAuth authorization code for access + refresh tokens.
 */
async function exchangeReadaiCode(clientId, clientSecret, code, redirectUri) {
  const params = new URLSearchParams({
    code: code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code'
  });

  const resp = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': basicAuthHeader(clientId, clientSecret)
    },
    body: params
  });

  const text = await resp.text();
  let data;
  try { data = JSON.parse(text); } catch (e) {
    throw new Error('Read.ai returned non-JSON (HTTP ' + resp.status + '): ' + text.substring(0, 200));
  }
  if (data.error) {
    throw new Error('Read.ai code exchange failed: ' + (data.error_description || data.error));
  }
  if (!data.access_token) {
    throw new Error('Read.ai returned no access_token: ' + JSON.stringify(data).substring(0, 200));
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_expires_at: new Date(Date.now() + ((data.expires_in || 600) * 1000)).toISOString()
  };
}

/**
 * Dynamic client registration (RFC 7591).
 * Registers TaskFlow as an OAuth client with Read.ai.
 */
async function registerReadaiClient(redirectUri) {
  const resp = await fetch(REGISTER_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: 'TaskFlow',
      redirect_uris: [redirectUri],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      scope: 'openid email offline_access profile meeting:read',
      token_endpoint_auth_method: 'client_secret_basic'
    })
  });

  const text = await resp.text();
  let data;
  try { data = JSON.parse(text); } catch (e) {
    throw new Error('Read.ai registration returned non-JSON (HTTP ' + resp.status + '): ' + text.substring(0, 200));
  }
  if (!resp.ok || data.error) {
    throw new Error('Read.ai client registration failed: ' + (data.error_description || data.error || 'HTTP ' + resp.status));
  }
  if (!data.client_id) {
    throw new Error('Read.ai registration returned no client_id: ' + text.substring(0, 200));
  }

  return {
    client_id: data.client_id,
    client_secret: data.client_secret || ''
  };
}

module.exports = { refreshReadaiToken, exchangeReadaiCode, registerReadaiClient };
