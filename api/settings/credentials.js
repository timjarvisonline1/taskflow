const { getServiceClient, verifyUserToken, cors } = require('../_lib/supabase');
const { exchangeZohoCode } = require('../_lib/zoho-auth');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const client = getServiceClient();

  /* ── GET: list all integrations for this user ── */
  if (req.method === 'GET') {
    const { data, error } = await client
      .from('integration_credentials')
      .select('id,platform,credentials,config,last_sync_at,last_sync_status,last_sync_message,is_active,created_at,updated_at')
      .eq('user_id', userId)
      .order('platform');

    if (error) return res.status(500).json({ error: error.message });

    // Mask credentials — never send full keys to the client
    // Return which credential keys are set (without values) so the UI can show placeholders
    const integrations = (data || []).map(row => {
      const creds = row.credentials || {};
      const stored_keys = Object.keys(creds).filter(k => !!creds[k]);
      delete row.credentials; // never send actual values
      return { ...row, has_credentials: stored_keys.length > 0, stored_keys };
    });

    return res.status(200).json({ integrations });
  }

  /* ── POST: create or update credentials for a platform ── */
  if (req.method === 'POST') {
    const { platform, credentials, config } = req.body || {};
    if (!platform) return res.status(400).json({ error: 'platform is required' });

    let creds = credentials || {};
    let mergedConfig = config || {};

    // Merge with existing stored credentials so that empty form fields
    // (which the GET endpoint intentionally omits for security) don't
    // accidentally wipe previously saved keys.
    const existing = await client
      .from('integration_credentials')
      .select('credentials,config')
      .eq('user_id', userId)
      .eq('platform', platform)
      .maybeSingle();

    if (existing && existing.data) {
      const storedCreds = existing.data.credentials || {};
      const storedConfig = existing.data.config || {};
      // Stored values are used as fallback — incoming non-empty values win
      Object.keys(storedCreds).forEach(k => {
        if (!creds[k]) creds[k] = storedCreds[k];
      });
      Object.keys(storedConfig).forEach(k => {
        if (!mergedConfig[k]) mergedConfig[k] = storedConfig[k];
      });
    }

    // For Zoho platforms: if auth code is present but no refresh_token, exchange it
    if ((platform === 'zoho_books' || platform === 'zoho_payments') && creds.client_id && creds.client_secret) {
      const authCode = creds.code || creds.auth_code;
      if (authCode && !creds.refresh_token) {
        try {
          const tokens = await exchangeZohoCode(creds.client_id, creds.client_secret, authCode);
          creds = { ...creds, ...tokens };
          delete creds.code;
          delete creds.auth_code;
        } catch (e) {
          return res.status(200).json({ success: false, error: 'Code exchange failed: ' + e.message });
        }
      }
    }

    const row = {
      user_id: userId,
      platform: platform,
      credentials: creds,
      config: mergedConfig,
      is_active: true,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await client
      .from('integration_credentials')
      .upsert(row, { onConflict: 'user_id,platform' })
      .select('id,platform,config,last_sync_at,last_sync_status,is_active')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, integration: data });
  }

  /* ── DELETE: remove credentials for a platform ── */
  if (req.method === 'DELETE') {
    const { platform } = req.body || {};
    if (!platform) return res.status(400).json({ error: 'platform is required' });

    const { error } = await client
      .from('integration_credentials')
      .delete()
      .eq('user_id', userId)
      .eq('platform', platform);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
