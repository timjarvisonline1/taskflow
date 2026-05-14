const { verifyUserToken, cors, getCredentials } = require('../_lib/supabase');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { platform, credentials, config } = req.body || {};
  if (!platform) return res.status(400).json({ error: 'platform is required' });

  // Merge form fields with stored credentials
  let mergedCreds = credentials || {};
  let mergedConfig = config || {};
  const stored = await getCredentials(userId, platform);
  if (stored) {
    const storedCreds = stored.credentials || {};
    const storedConfig = stored.config || {};
    Object.keys(storedCreds).forEach(k => { if (!mergedCreds[k]) mergedCreds[k] = storedCreds[k]; });
    Object.keys(storedConfig).forEach(k => { if (!mergedConfig[k]) mergedConfig[k] = storedConfig[k]; });
  }

  try {
    if (platform === 'brex')      return await testBrex(res, mergedCreds);
    if (platform === 'mercury')   return await testMercury(res, mergedCreds);
    if (platform === 'gmail')     return await testGmail(res, userId, mergedCreds);
    if (platform === 'anthropic') return await testAnthropic(res, mergedCreds, mergedConfig);
    if (platform === 'openai')    return await testOpenAI(res, mergedCreds);
    return res.status(400).json({ error: 'Unknown platform: ' + platform });
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

async function testGmail(res, userId, creds) {
  if (!creds.access_token && !creds.refresh_token) {
    if (!creds.client_id || !creds.client_secret) {
      throw new Error('Client ID and Client Secret are required.');
    }
    return res.status(200).json({
      success: true,
      details: 'Credentials saved. Click "Connect Gmail" to authorize access.',
      needs_oauth: true
    });
  }
  let accessToken = creds.access_token;
  if (!accessToken && creds.refresh_token) {
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

async function testAnthropic(res, creds, config) {
  const apiKey = creds.api_key;
  if (!apiKey) throw new Error('API Key is required');
  const model = (config && config.model) || 'claude-sonnet-4-6';
  const Anthropic = require('@anthropic-ai/sdk');
  const anthropic = new Anthropic({ apiKey: apiKey });
  const resp = await anthropic.messages.create({
    model: model,
    max_tokens: 32,
    messages: [{ role: 'user', content: 'Reply with exactly: OK' }]
  });
  return res.status(200).json({
    success: true,
    details: 'Connected — model: ' + resp.model
  });
}

async function testOpenAI(res, creds) {
  const apiKey = creds.api_key;
  if (!apiKey) throw new Error('API Key is required');
  const resp = await fetch('https://api.openai.com/v1/models', {
    headers: { 'Authorization': 'Bearer ' + apiKey }
  });
  if (!resp.ok) throw new Error('OpenAI API returned ' + resp.status);
  return res.status(200).json({ success: true, details: 'Connected' });
}
