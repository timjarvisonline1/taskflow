const { getServiceClient } = require('./supabase');

const TOKEN_ENDPOINT = 'https://authn.read.ai/oauth2/token';

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
    client_id: creds.client_id,
    client_secret: creds.client_secret,
    grant_type: 'refresh_token'
  });

  const resp = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
  // Refresh tokens rotate on each use
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
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code'
  });

  const resp = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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

module.exports = { refreshReadaiToken, exchangeReadaiCode };
