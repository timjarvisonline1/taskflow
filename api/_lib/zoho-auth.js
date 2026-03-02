const { getServiceClient } = require('./supabase');

/**
 * Refresh a Zoho OAuth access token if expired (or within 60s of expiry).
 * Updates the stored credentials in integration_credentials.
 * Returns the valid access_token string.
 */
async function refreshZohoToken(credentialRow, platform) {
  const creds = credentialRow.credentials || {};
  const expiresAt = new Date(creds.token_expires_at || 0);

  // Still valid (with 60s buffer)
  if (expiresAt > new Date(Date.now() + 60000) && creds.access_token) {
    return creds.access_token;
  }

  // Need to refresh
  if (!creds.refresh_token) {
    throw new Error('No refresh_token stored for ' + platform);
  }

  const params = new URLSearchParams({
    refresh_token: creds.refresh_token,
    client_id: creds.client_id,
    client_secret: creds.client_secret,
    grant_type: 'refresh_token'
  });

  const resp = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST',
    body: params
  });

  const data = await resp.json();
  if (data.error) {
    throw new Error('Zoho token refresh failed: ' + (data.error_description || data.error));
  }

  // Update stored credentials with new access token
  const newCreds = {
    ...creds,
    access_token: data.access_token,
    token_expires_at: new Date(Date.now() + ((data.expires_in || 3600) * 1000)).toISOString()
  };

  const client = getServiceClient();
  await client
    .from('integration_credentials')
    .update({ credentials: newCreds, updated_at: new Date().toISOString() })
    .eq('id', credentialRow.id);

  return data.access_token;
}

/**
 * Exchange a Zoho authorization code for refresh + access tokens.
 * Used during initial setup (Self Client flow).
 */
async function exchangeZohoCode(clientId, clientSecret, code) {
  const params = new URLSearchParams({
    code: code,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code'
  });

  const resp = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST',
    body: params
  });

  const text = await resp.text();
  let data;
  try { data = JSON.parse(text); } catch (e) {
    throw new Error('Zoho returned non-JSON (HTTP ' + resp.status + '): ' + text.substring(0, 200));
  }
  if (data.error) {
    throw new Error('Zoho code exchange failed: ' + (data.error_description || data.error));
  }
  if (!data.access_token) {
    throw new Error('Zoho returned no access_token: ' + JSON.stringify(data).substring(0, 200));
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_expires_at: new Date(Date.now() + ((data.expires_in || 3600) * 1000)).toISOString()
  };
}

module.exports = { refreshZohoToken, exchangeZohoCode };
