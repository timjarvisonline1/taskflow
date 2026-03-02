const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tnkmxmlgdhlgehlrbxuf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

let _client = null;

function getServiceClient() {
  if (!_client) {
    if (!SUPABASE_SERVICE_KEY) throw new Error('SUPABASE_SERVICE_KEY not set');
    _client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }
  return _client;
}

/* Verify a user's Supabase JWT from the Authorization header */
async function verifyUserToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const client = getServiceClient();
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}

/* Load integration credentials for a platform */
async function getCredentials(userId, platform) {
  const client = getServiceClient();
  const { data, error } = await client
    .from('integration_credentials')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', platform)
    .eq('is_active', true)
    .single();
  if (error || !data) return null;
  return data;
}

/* Update last_sync status on an integration */
async function updateSyncStatus(userId, platform, status, message) {
  const client = getServiceClient();
  await client
    .from('integration_credentials')
    .update({
      last_sync_at: new Date().toISOString(),
      last_sync_status: status,
      last_sync_message: message || '',
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('platform', platform);
}

/* Log a sync operation */
async function logSync(userId, platform, syncType, stats) {
  const client = getServiceClient();
  await client.from('sync_log').insert({
    user_id: userId,
    platform: platform,
    sync_type: syncType,
    records_fetched: stats.fetched || 0,
    records_inserted: stats.inserted || 0,
    records_updated: stats.updated || 0,
    error_message: stats.error || '',
    completed_at: new Date().toISOString()
  });
}

/* Upsert a finance payment — deduplicates by source + source_id */
async function upsertPayment(userId, source, sourceId, paymentData) {
  const client = getServiceClient();

  // Check for existing record by source + source_id (if sourceId is non-empty)
  if (sourceId) {
    const { data: existing } = await client
      .from('finance_payments')
      .select('id, external_status')
      .eq('user_id', userId)
      .eq('source', source)
      .eq('source_id', sourceId)
      .maybeSingle();

    if (existing) {
      // Update existing record — sync-safe fields only (NEVER overwrite status/client_id)
      const updateRow = {};
      if (paymentData.external_status !== undefined) updateRow.external_status = paymentData.external_status;
      if (paymentData.pending_amount !== undefined) updateRow.pending_amount = paymentData.pending_amount;
      if (paymentData.metadata !== undefined) updateRow.metadata = paymentData.metadata;
      if (paymentData.date !== undefined) updateRow.date = paymentData.date;
      if (paymentData.amount !== undefined) updateRow.amount = paymentData.amount;
      if (paymentData.fee !== undefined) updateRow.fee = paymentData.fee;
      if (paymentData.net !== undefined) updateRow.net = paymentData.net;
      if (paymentData.payer_name !== undefined) updateRow.payer_name = paymentData.payer_name;
      if (paymentData.payer_email !== undefined) updateRow.payer_email = paymentData.payer_email;
      if (paymentData.description !== undefined) updateRow.description = paymentData.description;
      if (paymentData.direction !== undefined) updateRow.direction = paymentData.direction;
      if (paymentData.type !== undefined) updateRow.type = paymentData.type;
      // NOTE: status and client_id are NOT updated — preserves user's matched/unmatched state

      if (Object.keys(updateRow).length > 0) {
        await client.from('finance_payments').update(updateRow).eq('id', existing.id);
      }
      return { action: 'updated', id: existing.id };
    }
  }

  // Apply payer_client_map auto-matching
  const match = await applyPayerMap(userId, paymentData.payer_email, paymentData.payer_name);
  if (match) {
    paymentData.client_id = match.clientId;
    paymentData.status = 'matched';
  }

  // Insert new record
  const row = {
    user_id: userId,
    source: source,
    source_id: sourceId || '',
    ...paymentData
  };

  const { data, error } = await client
    .from('finance_payments')
    .insert(row)
    .select('id')
    .single();

  if (error) throw error;
  return { action: 'inserted', id: data.id };
}

/* Look up payer_client_map for auto-matching */
async function applyPayerMap(userId, payerEmail, payerName) {
  const client = getServiceClient();
  let query = client
    .from('payer_client_map')
    .select('client_id')
    .eq('user_id', userId);

  if (payerEmail) {
    query = query.eq('payer_email', payerEmail);
  } else if (payerName) {
    query = query.eq('payer_name', payerName);
  } else {
    return null;
  }

  const { data } = await query.maybeSingle();
  return data ? { clientId: data.client_id, status: 'matched' } : null;
}

/* CORS headers for API responses */
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  return res;
}

module.exports = {
  getServiceClient,
  verifyUserToken,
  getCredentials,
  updateSyncStatus,
  logSync,
  upsertPayment,
  applyPayerMap,
  cors
};
