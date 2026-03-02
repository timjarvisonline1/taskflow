const { getServiceClient, verifyUserToken, cors } = require('../_lib/supabase');
const { exchangeZohoCode, refreshZohoToken } = require('../_lib/zoho-auth');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { platform, credentials, config } = req.body || {};
  if (!platform) return res.status(400).json({ error: 'platform is required' });

  try {
    if (platform === 'brex') {
      return await testBrex(res, credentials);
    } else if (platform === 'mercury') {
      return await testMercury(res, credentials);
    } else if (platform === 'zoho_books') {
      return await testZohoBooks(res, userId, credentials, config);
    } else if (platform === 'zoho_payments') {
      return await testZohoPayments(res, userId, credentials, config);
    } else {
      return res.status(400).json({ error: 'Unknown platform: ' + platform });
    }
  } catch (e) {
    return res.status(200).json({ success: false, error: e.message });
  }
};

async function testBrex(res, creds) {
  const resp = await fetch('https://platform.brexapis.com/v2/accounts/cash', {
    headers: { 'Authorization': 'Bearer ' + creds.api_key }
  });
  if (!resp.ok) throw new Error('Brex API returned ' + resp.status);
  const data = await resp.json();
  const accounts = data.items || [];
  return res.status(200).json({
    success: true,
    details: accounts.length + ' cash account(s) found',
    accounts: accounts.map(a => ({ id: a.id, name: a.name, balance: a.current_balance }))
  });
}

async function testMercury(res, creds) {
  const resp = await fetch('https://api.mercury.com/api/v1/accounts', {
    headers: { 'Authorization': 'Bearer secret-token:' + creds.api_key }
  });
  if (!resp.ok) throw new Error('Mercury API returned ' + resp.status);
  const data = await resp.json();
  const accounts = data.accounts || [];
  return res.status(200).json({
    success: true,
    details: accounts.length + ' account(s) found',
    accounts: accounts.map(a => ({ id: a.id, name: a.name || a.nickname, type: a.type }))
  });
}

async function testZohoBooks(res, userId, creds, config) {
  // If auth_code is provided, exchange it for refresh token first
  let tokenCreds = { ...creds };
  if (creds.auth_code && !creds.refresh_token) {
    const tokens = await exchangeZohoCode(creds.client_id, creds.client_secret, creds.auth_code);
    tokenCreds = { ...creds, ...tokens };
    delete tokenCreds.auth_code;

    // Save the refresh token back to the database
    const client = getServiceClient();
    await client
      .from('integration_credentials')
      .update({ credentials: tokenCreds, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('platform', 'zoho_books');
  }

  // Test the connection by listing organizations
  const accessToken = tokenCreds.access_token;
  const resp = await fetch('https://www.zohoapis.com/books/v3/organizations', {
    headers: { 'Authorization': 'Zoho-oauthtoken ' + accessToken }
  });
  if (!resp.ok) throw new Error('Zoho Books API returned ' + resp.status);
  const data = await resp.json();
  const orgs = data.organizations || [];

  return res.status(200).json({
    success: true,
    details: orgs.length + ' organization(s) found',
    organizations: orgs.map(o => ({ id: o.organization_id, name: o.name })),
    credentials_updated: !!creds.auth_code // Signal to client that refresh token was obtained
  });
}

async function testZohoPayments(res, userId, creds, config) {
  let tokenCreds = { ...creds };
  if (creds.auth_code && !creds.refresh_token) {
    const tokens = await exchangeZohoCode(creds.client_id, creds.client_secret, creds.auth_code);
    tokenCreds = { ...creds, ...tokens };
    delete tokenCreds.auth_code;

    const client = getServiceClient();
    await client
      .from('integration_credentials')
      .update({ credentials: tokenCreds, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('platform', 'zoho_payments');
  }

  const accountId = (config || {}).account_id || '';
  const accessToken = tokenCreds.access_token;

  // Test by listing recent payments
  let url = 'https://payments.zoho.com/api/v1/payments?per_page=1';
  if (accountId) url += '&account_id=' + accountId;

  const resp = await fetch(url, {
    headers: { 'Authorization': 'Zoho-oauthtoken ' + accessToken }
  });
  if (!resp.ok) throw new Error('Zoho Payments API returned ' + resp.status);
  const data = await resp.json();

  return res.status(200).json({
    success: true,
    details: 'Connection successful',
    credentials_updated: !!creds.auth_code
  });
}
