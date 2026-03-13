const crypto = require('crypto');

// Module-level token cache
let _cachedToken = null;
let _tokenExpiry = 0;

/**
 * Get a Google OAuth2 access token from a service account JSON key.
 * Uses Node.js built-in crypto (RS256 JWT) — zero npm dependencies.
 */
async function getGA4AccessToken(serviceAccountJson) {
  // Return cached token if still valid (with 60s buffer)
  if (_cachedToken && Date.now() < _tokenExpiry - 60000) {
    return _cachedToken;
  }

  const sa = typeof serviceAccountJson === 'string' ? JSON.parse(serviceAccountJson) : serviceAccountJson;
  const now = Math.floor(Date.now() / 1000);

  // Build JWT header + payload
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };

  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = b64(header) + '.' + b64(payload);

  // Sign with RS256 using service account private key
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  const signature = signer.sign(sa.private_key, 'base64url');
  const jwt = unsigned + '.' + signature;

  // Exchange JWT for access token
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + jwt
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error('Google token exchange failed (' + resp.status + '): ' + err);
  }

  const data = await resp.json();
  _cachedToken = data.access_token;
  _tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
  return _cachedToken;
}

/**
 * Call the GA4 Realtime API.
 * @param {string} accessToken
 * @param {string} propertyId - GA4 property ID (numeric, no "properties/" prefix)
 * @param {string[]} dimensions - e.g. ['country', 'city']
 * @param {string[]} metrics - e.g. ['activeUsers']
 * @returns {object} GA4 API response
 */
async function callGA4RealtimeApi(accessToken, propertyId, dimensions, metrics) {
  const url = 'https://analyticsdata.googleapis.com/v1beta/properties/' + propertyId + ':runRealtimeReport';
  const body = {
    dimensions: dimensions.map(d => ({ name: d })),
    metrics: metrics.map(m => ({ name: m }))
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error('GA4 API error (' + resp.status + '): ' + err);
  }

  return await resp.json();
}

module.exports = { getGA4AccessToken, callGA4RealtimeApi };
