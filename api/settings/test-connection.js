const { getServiceClient, verifyUserToken, cors, getCredentials } = require('../_lib/supabase');
const { exchangeZohoCode, refreshZohoToken } = require('../_lib/zoho-auth');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { platform, credentials, config } = req.body || {};
  if (!platform) return res.status(400).json({ error: 'platform is required' });

  // Merge form fields with stored credentials (form fields override stored ones when non-empty)
  let mergedCreds = credentials || {};
  let mergedConfig = config || {};
  const stored = await getCredentials(userId, platform);
  if (stored) {
    const storedCreds = stored.credentials || {};
    const storedConfig = stored.config || {};
    // For each stored key, use it as fallback if form didn't provide a value
    Object.keys(storedCreds).forEach(k => {
      if (!mergedCreds[k]) mergedCreds[k] = storedCreds[k];
    });
    Object.keys(storedConfig).forEach(k => {
      if (!mergedConfig[k]) mergedConfig[k] = storedConfig[k];
    });
  }

  try {
    if (platform === 'brex') {
      return await testBrex(res, mergedCreds);
    } else if (platform === 'mercury') {
      return await testMercury(res, mergedCreds);
    } else if (platform === 'zoho_books') {
      return await testZohoBooks(res, userId, mergedCreds, mergedConfig);
    } else if (platform === 'zoho_payments') {
      return await testZohoPayments(res, userId, mergedCreds, mergedConfig);
    } else if (platform === 'gmail') {
      return await testGmail(res, userId, mergedCreds);
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
  const authCode = creds.code || creds.auth_code;
  if (authCode && !creds.refresh_token) {
    const tokens = await exchangeZohoCode(creds.client_id, creds.client_secret, authCode);
    tokenCreds = { ...creds, ...tokens };
    delete tokenCreds.code;
    delete tokenCreds.auth_code;
  }

  // If we have a refresh_token but expired/missing access_token, refresh it
  if (tokenCreds.refresh_token && !tokenCreds.access_token) {
    const params = new URLSearchParams({
      refresh_token: tokenCreds.refresh_token,
      client_id: tokenCreds.client_id,
      client_secret: tokenCreds.client_secret,
      grant_type: 'refresh_token'
    });
    const refreshResp = await fetch('https://accounts.zoho.com/oauth/v2/token', { method: 'POST', body: params });
    const refreshData = await refreshResp.json();
    if (refreshData.access_token) {
      tokenCreds.access_token = refreshData.access_token;
    }
  }

  // Test the connection by listing organizations
  const accessToken = tokenCreds.access_token;
  if (!accessToken) {
    throw new Error('No access token available. Provide an Auth Code or Refresh Token.');
  }

  const resp = await fetch('https://www.zohoapis.com/books/v3/organizations', {
    headers: { 'Authorization': 'Zoho-oauthtoken ' + accessToken }
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error('Zoho Books API returned ' + resp.status + ': ' + errText.substring(0, 200));
  }
  const data = await resp.json();
  const orgs = data.organizations || [];

  // For each org, try to fetch a quick invoice count to show which org has data
  const orgDetails = [];
  for (const o of orgs) {
    let invoiceCount = '?';
    try {
      const invResp = await fetch(
        'https://www.zohoapis.com/books/v3/invoices?organization_id=' + o.organization_id + '&per_page=1',
        { headers: { 'Authorization': 'Zoho-oauthtoken ' + accessToken } }
      );
      if (invResp.ok) {
        const invData = await invResp.json();
        const pc = invData.page_context || {};
        invoiceCount = pc.total || (invData.invoices || []).length;
      }
    } catch (e) { /* ignore */ }

    orgDetails.push({
      id: o.organization_id,
      name: o.name,
      is_default: !!o.is_default_org,
      invoices: invoiceCount
    });
  }

  // Recommend the org that has data, or the default org
  const orgWithData = orgDetails.find(o => o.invoices > 0);
  const defaultOrg = orgDetails.find(o => o.is_default);
  const recommended = orgWithData || defaultOrg || orgDetails[0];

  return res.status(200).json({
    success: true,
    details: orgs.length + ' organization(s) found',
    organizations: orgDetails,
    recommended_org_id: recommended ? recommended.id : null,
    refresh_token: tokenCreds.refresh_token || null
  });
}

async function testZohoPayments(res, userId, creds, config) {
  let tokenCreds = { ...creds };
  const authCode = creds.code || creds.auth_code;
  if (authCode && !creds.refresh_token) {
    const tokens = await exchangeZohoCode(creds.client_id, creds.client_secret, authCode);
    tokenCreds = { ...creds, ...tokens };
    delete tokenCreds.code;
    delete tokenCreds.auth_code;
  }

  const accountId = (config || {}).account_id || '';
  const accessToken = tokenCreds.access_token;

  if (!accountId) {
    throw new Error('Account ID is required. Find it in Zoho Payments → Settings → Account Details');
  }

  // Test by listing recent payments
  const url = 'https://payments.zoho.com/api/v1/payments?per_page=1&account_id=' + accountId;

  const resp = await fetch(url, {
    headers: { 'Authorization': 'Zoho-oauthtoken ' + accessToken }
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error('Zoho Payments API returned ' + resp.status + ': ' + errText.substring(0, 300));
  }
  const data = await resp.json();

  return res.status(200).json({
    success: true,
    details: 'Connection successful',
    refresh_token: tokenCreds.refresh_token || null
  });
}

async function testGmail(res, userId, creds) {
  // For Gmail, test connection requires an access token (from OAuth flow).
  // If we have a refresh_token, try to get profile info.
  if (!creds.access_token && !creds.refresh_token) {
    // No tokens yet — just verify client_id and client_secret are present
    if (!creds.client_id || !creds.client_secret) {
      throw new Error('Client ID and Client Secret are required. Get these from Google Cloud Console → APIs & Services → Credentials.');
    }
    return res.status(200).json({
      success: true,
      details: 'Credentials saved. Click "Connect Gmail" to authorize access.',
      needs_oauth: true
    });
  }

  // We have tokens — try to get profile
  let accessToken = creds.access_token;
  if (!accessToken && creds.refresh_token) {
    // Try to refresh
    const { refreshGmailToken } = require('../_lib/gmail-auth');
    const credRow = await getCredentials(userId, 'gmail');
    accessToken = await refreshGmailToken(credRow);
  }

  const resp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { 'Authorization': 'Bearer ' + accessToken }
  });
  if (!resp.ok) throw new Error('Gmail API returned ' + resp.status);
  const profile = await resp.json();

  return res.status(200).json({
    success: true,
    details: 'Connected as ' + profile.emailAddress + ' (' + profile.messagesTotal + ' messages)',
    email: profile.emailAddress
  });
}
