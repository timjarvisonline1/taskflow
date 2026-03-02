const { getCredentials, updateSyncStatus, logSync, upsertPayment, getServiceClient } = require('./supabase');

const MERCURY_BASE = 'https://api.mercury.com/api/v1';

async function syncMercury(userId) {
  const cred = await getCredentials(userId, 'mercury');
  if (!cred) throw new Error('Mercury not connected');

  const apiKey = cred.credentials.api_key;
  if (!apiKey) throw new Error('Mercury API key missing');

  const headers = { 'Authorization': 'Bearer secret-token:' + apiKey, 'Content-Type': 'application/json' };
  const stats = { fetched: 0, inserted: 0, updated: 0, error: '' };

  try {
    // 1. Get accounts
    const acctResp = await fetch(MERCURY_BASE + '/accounts', { headers });
    if (!acctResp.ok) throw new Error('Mercury accounts API: ' + acctResp.status);
    const acctData = await acctResp.json();
    const accounts = acctData.accounts || [];

    // Store account IDs in config if not already set
    if (!cred.config.account_ids || cred.config.account_ids.length === 0) {
      const client = getServiceClient();
      await client
        .from('integration_credentials')
        .update({ config: { ...cred.config, account_ids: accounts.map(a => a.id) }, updated_at: new Date().toISOString() })
        .eq('id', cred.id);
    }

    // Use last_sync_at or default to 90 days ago
    const since = cred.last_sync_at
      ? new Date(cred.last_sync_at).toISOString().split('T')[0]
      : new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];

    // 2. Fetch transactions for each account
    for (const acct of accounts) {
      let offset = 0;
      const limit = 500;
      let hasMore = true;

      while (hasMore) {
        const url = MERCURY_BASE + '/account/' + acct.id + '/transactions?start=' + since + '&limit=' + limit + '&offset=' + offset;
        const txResp = await fetch(url, { headers });
        if (!txResp.ok) throw new Error('Mercury transactions API: ' + txResp.status);
        const txData = await txResp.json();
        const items = txData.transactions || [];
        stats.fetched += items.length;

        for (const tx of items) {
          const rawAmount = parseFloat(tx.amount) || 0;
          const direction = rawAmount >= 0 ? 'inflow' : 'outflow';
          const amount = Math.abs(rawAmount);

          // Determine date — use postedAt (settled) or createdAt (pending)
          const txDate = tx.postedAt
            ? tx.postedAt.split('T')[0]
            : (tx.createdAt ? tx.createdAt.split('T')[0] : null);

          const result = await upsertPayment(userId, 'mercury', tx.id, {
            date: txDate,
            amount: amount,
            fee: 0,
            net: amount,
            direction: direction,
            type: (tx.kind === 'internalTransfer') ? 'transfer' : 'payment',
            payer_email: '',
            payer_name: tx.counterpartyName || '',
            description: tx.note || tx.bankDescription || '',
            category: '',
            external_status: (tx.status || '').toLowerCase(),
            pending_amount: tx.status === 'pending' ? amount : 0,
            metadata: JSON.stringify({
              mercury_account_id: acct.id,
              kind: tx.kind,
              counterparty_id: tx.counterpartyId || ''
            }),
            status: 'unmatched'
          });

          if (result.action === 'inserted') stats.inserted++;
          else if (result.action === 'updated') stats.updated++;
        }

        hasMore = items.length === limit;
        offset += items.length;
      }
    }

    await updateSyncStatus(userId, 'mercury', 'ok', stats.inserted + ' new, ' + stats.updated + ' updated');
    await logSync(userId, 'mercury', 'poll', stats);
    return stats;
  } catch (e) {
    stats.error = e.message;
    await updateSyncStatus(userId, 'mercury', 'error', e.message);
    await logSync(userId, 'mercury', 'poll', stats);
    throw e;
  }
}

/* Process a Mercury webhook event (called by webhook handler) */
async function processMercuryWebhook(userId, event) {
  if (!event.resourceType || event.resourceType !== 'transaction') return { action: 'skipped' };

  const tx = event.mergePatch || {};
  const resourceId = event.resourceId;
  if (!resourceId) return { action: 'skipped' };

  // For webhook events, we only get partial data (the changed fields).
  // If it's a new transaction, we need to fetch full details via API.
  const cred = await getCredentials(userId, 'mercury');
  if (!cred) return { action: 'skipped' };

  const headers = { 'Authorization': 'Bearer secret-token:' + cred.credentials.api_key };

  // Try fetching the full transaction from the all-transactions endpoint
  const resp = await fetch(MERCURY_BASE + '/transactions?search=' + resourceId, { headers });
  if (!resp.ok) return { action: 'error', error: 'Could not fetch transaction ' + resourceId };

  const data = await resp.json();
  const fullTx = (data.transactions || []).find(t => t.id === resourceId);
  if (!fullTx) return { action: 'skipped' };

  const rawAmount = parseFloat(fullTx.amount) || 0;
  const direction = rawAmount >= 0 ? 'inflow' : 'outflow';
  const amount = Math.abs(rawAmount);
  const txDate = fullTx.postedAt ? fullTx.postedAt.split('T')[0] : (fullTx.createdAt ? fullTx.createdAt.split('T')[0] : null);

  const result = await upsertPayment(userId, 'mercury', fullTx.id, {
    date: txDate,
    amount: amount,
    fee: 0,
    net: amount,
    direction: direction,
    type: (fullTx.kind === 'internalTransfer') ? 'transfer' : 'payment',
    payer_email: '',
    payer_name: fullTx.counterpartyName || '',
    description: fullTx.note || fullTx.bankDescription || '',
    category: '',
    external_status: (fullTx.status || '').toLowerCase(),
    pending_amount: fullTx.status === 'pending' ? amount : 0,
    metadata: JSON.stringify({ kind: fullTx.kind, counterparty_id: fullTx.counterpartyId || '' }),
    status: 'unmatched'
  });

  await logSync(userId, 'mercury', 'webhook', { fetched: 1, inserted: result.action === 'inserted' ? 1 : 0, updated: result.action === 'updated' ? 1 : 0 });
  return result;
}

module.exports = { syncMercury, processMercuryWebhook };
