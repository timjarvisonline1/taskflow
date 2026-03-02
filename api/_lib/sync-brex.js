const { getCredentials, updateSyncStatus, logSync, upsertPayment } = require('./supabase');

const BREX_BASE = 'https://platform.brexapis.com';

async function syncBrex(userId) {
  const cred = await getCredentials(userId, 'brex');
  if (!cred) throw new Error('Brex not connected');

  const apiKey = cred.credentials.api_key;
  if (!apiKey) throw new Error('Brex API key missing');

  const headers = { 'Authorization': 'Bearer ' + apiKey };
  const stats = { fetched: 0, inserted: 0, updated: 0, error: '' };

  try {
    // 1. Get cash accounts
    const acctResp = await fetch(BREX_BASE + '/v2/accounts/cash', { headers });
    if (!acctResp.ok) {
      const errText = await acctResp.text();
      throw new Error('Brex accounts API ' + acctResp.status + ': ' + errText.substring(0, 300));
    }
    const acctData = await acctResp.json();
    const accounts = acctData.items || [];

    // Use last_sync_at or default to 90 days ago
    // Brex expects ISO 8601 without milliseconds: YYYY-MM-DDTHH:MM:SSZ
    const sinceDate = cred.last_sync_at
      ? new Date(cred.last_sync_at)
      : new Date(Date.now() - 90 * 86400000);
    const since = sinceDate.toISOString().replace(/\.\d{3}Z$/, 'Z');

    // 2. Fetch transactions for each cash account
    for (const acct of accounts) {
      let cursor = null;
      let hasMore = true;

      while (hasMore) {
        let url = BREX_BASE + '/v2/transactions/cash/' + acct.id;
        if (since) url += '?posted_at_start=' + encodeURIComponent(since);
        if (cursor) url += (since ? '&' : '?') + 'cursor=' + encodeURIComponent(cursor);

        const txResp = await fetch(url, { headers });
        if (!txResp.ok) {
          const txErr = await txResp.text();
          throw new Error('Brex txns ' + txResp.status + ' (acct=' + acct.id + ', url_date=' + since + '): ' + txErr.substring(0, 200));
        }
        const txData = await txResp.json();
        const items = txData.items || [];
        stats.fetched += items.length;

        for (const tx of items) {
          // Brex amounts are in cents
          const rawAmount = (tx.amount && tx.amount.amount) ? parseFloat(tx.amount.amount) / 100 : 0;
          const direction = rawAmount >= 0 ? 'inflow' : 'outflow';
          const amount = Math.abs(rawAmount);

          const result = await upsertPayment(userId, 'brex', tx.id, {
            date: tx.posted_at_date || tx.initiated_at_date || null,
            amount: amount,
            fee: 0,
            net: amount,
            direction: direction,
            type: tx.type === 'TRANSFER' ? 'transfer' : 'payment',
            payer_email: '',
            payer_name: tx.description || '',
            description: tx.memo || tx.description || '',
            category: '',
            external_status: (tx.status || '').toLowerCase(),
            pending_amount: 0,
            metadata: JSON.stringify({ brex_type: tx.type, brex_account_id: acct.id }),
            status: 'unmatched'
          });

          if (result.action === 'inserted') stats.inserted++;
          else if (result.action === 'updated') stats.updated++;
        }

        cursor = txData.next_cursor || null;
        hasMore = !!cursor;
      }
    }

    await updateSyncStatus(userId, 'brex', 'ok', stats.inserted + ' new, ' + stats.updated + ' updated');
    await logSync(userId, 'brex', 'poll', stats);
    return stats;
  } catch (e) {
    stats.error = e.message;
    await updateSyncStatus(userId, 'brex', 'error', e.message);
    await logSync(userId, 'brex', 'poll', stats);
    throw e;
  }
}

module.exports = { syncBrex };
