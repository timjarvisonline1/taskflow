const { getCredentials, updateSyncStatus, logSync, upsertPayment, upsertAccountBalance } = require('./supabase');

const BREX_BASE = 'https://platform.brexapis.com';
const CSV_CUTOFF = '2026-02-28'; // All data before this date was imported via CSV — never re-sync

async function syncBrex(userId) {
  const cred = await getCredentials(userId, 'brex');
  if (!cred) throw new Error('Brex not connected');

  const apiKey = cred.credentials.api_key;
  if (!apiKey) throw new Error('Brex API key missing');

  const headers = { 'Authorization': 'Bearer ' + apiKey };
  const stats = { fetched: 0, inserted: 0, updated: 0, skipped: 0, error: '' };

  try {
    // 1. Get cash accounts + capture balances
    const acctResp = await fetch(BREX_BASE + '/v2/accounts/cash', { headers });
    if (!acctResp.ok) {
      const errText = await acctResp.text();
      throw new Error('Brex accounts API ' + acctResp.status + ': ' + errText.substring(0, 300));
    }
    const acctData = await acctResp.json();
    const accounts = acctData.items || [];

    for (const acct of accounts) {
      const curBal = (acct.current_balance && acct.current_balance.amount) ? parseFloat(acct.current_balance.amount) / 100 : 0;
      const availBal = (acct.available_balance && acct.available_balance.amount) ? parseFloat(acct.available_balance.amount) / 100 : 0;
      await upsertAccountBalance(userId, 'brex', acct.id, {
        accountName: acct.name || 'Brex Cash',
        accountType: 'checking',
        currentBalance: curBal,
        availableBalance: availBal,
        currency: (acct.current_balance && acct.current_balance.currency) || 'USD'
      });
    }

    // 2. Compute incremental sync start date (ISO 8601 format required by Brex API)
    //    posted_at_start parameter needs full ISO 8601: 2026-02-28T00:00:00Z
    const cutoffISO = CSV_CUTOFF + 'T00:00:00Z';
    let since = cred.last_sync_at ? new Date(cred.last_sync_at).toISOString() : cutoffISO;
    if (since < cutoffISO) since = cutoffISO;

    // 3. Fetch cash transactions for each account (incremental — only new since last sync)
    for (const acct of accounts) {
      let cursor = null;
      let hasMore = true;

      while (hasMore) {
        const params = ['posted_at_start=' + since];
        if (cursor) params.push('cursor=' + encodeURIComponent(cursor));
        const url = BREX_BASE + '/v2/transactions/cash/' + encodeURIComponent(acct.id) + '?' + params.join('&');

        const txResp = await fetch(url, { headers });
        if (!txResp.ok) {
          const txErr = await txResp.text();
          throw new Error('Brex txns ' + txResp.status + ' (acct=' + acct.id + '): ' + txErr.substring(0, 200));
        }
        const txData = await txResp.json();
        const items = txData.items || [];
        stats.fetched += items.length;

        for (const tx of items) {
          const rawAmount = (tx.amount && tx.amount.amount) ? parseFloat(tx.amount.amount) / 100 : 0;
          const direction = rawAmount >= 0 ? 'inflow' : 'outflow';
          const amount = Math.abs(rawAmount);
          const txDate = tx.posted_at_date || tx.initiated_at_date || null;

          // Skip records before CSV cutoff (belt-and-suspenders with API filter)
          if (txDate && txDate < CSV_CUTOFF) { stats.skipped++; continue; }
          // Skip internal transfers (account-to-account moves — noise)
          if (tx.type === 'TRANSFER') { stats.skipped++; continue; }
          // Skip card settlement sweeps (daily aggregate debits like "Brex Card -$6,040.64")
          const txDesc = (tx.description || '').toLowerCase();
          if (txDesc === 'brex card' || txDesc.startsWith('brex card ')) { stats.skipped++; continue; }

          const result = await upsertPayment(userId, 'brex', tx.id, {
            date: txDate, amount: amount, fee: 0, net: amount,
            direction: direction, type: 'payment',
            payer_email: '', payer_name: tx.description || '',
            description: tx.memo || tx.description || '', category: '',
            external_status: (tx.status || '').toLowerCase(),
            pending_amount: 0,
            metadata: JSON.stringify({ brex_type: 'cash', brex_account_id: acct.id }),
            status: 'unmatched'
          });

          if (result.action === 'inserted') stats.inserted++;
          else if (result.action === 'updated') stats.updated++;
          else if (result.action === 'skipped') stats.skipped++;
        }

        cursor = txData.next_cursor || null;
        hasMore = !!cursor;
      }
    }

    // 4. Fetch card transactions from primary card account (incremental)
    let cardCursor = null;
    let cardHasMore = true;

    while (cardHasMore) {
      const cardParams = ['posted_at_start=' + since];
      if (cardCursor) cardParams.push('cursor=' + encodeURIComponent(cardCursor));
      const cardUrl = BREX_BASE + '/v2/transactions/card/primary?' + cardParams.join('&');

      const cardResp = await fetch(cardUrl, { headers });
      if (!cardResp.ok) {
        const cardErr = await cardResp.text();
        const cardErrMsg = 'Card sync failed (' + cardResp.status + '): ' + cardErr.substring(0, 100);
        console.log('Brex: ' + cardErrMsg);
        stats.cardError = cardErrMsg;
        break;
      }
      const cardData = await cardResp.json();
      const cardItems = cardData.items || [];
      stats.fetched += cardItems.length;

      for (const tx of cardItems) {
        const rawAmount = (tx.amount && tx.amount.amount) ? parseFloat(tx.amount.amount) / 100 : 0;
        const amount = Math.abs(rawAmount);
        const merchantDesc = (tx.merchant && tx.merchant.raw_descriptor) ? tx.merchant.raw_descriptor : (tx.description || '');
        const cardTxDate = tx.posted_at_date || tx.initiated_at_date || null;

        // Skip records before CSV cutoff
        if (cardTxDate && cardTxDate < CSV_CUTOFF) { stats.skipped++; continue; }

        const result = await upsertPayment(userId, 'brex', tx.id, {
          date: cardTxDate, amount: amount, fee: 0, net: amount,
          direction: 'outflow', type: 'expense',
          payer_email: '', payer_name: merchantDesc,
          description: merchantDesc, category: '',
          external_status: (tx.status || '').toLowerCase(),
          pending_amount: 0,
          metadata: JSON.stringify({
            brex_type: 'card', card_id: tx.card_id || '',
            merchant: tx.merchant || {}
          }),
          status: 'unmatched'
        });

        if (result.action === 'inserted') stats.inserted++;
        else if (result.action === 'updated') stats.updated++;
        else if (result.action === 'skipped') stats.skipped++;
      }

      cardCursor = cardData.next_cursor || null;
      cardHasMore = !!cardCursor;
    }

    const cardNote = stats.cardError ? ' ⚠ ' + stats.cardError : '';
    await updateSyncStatus(userId, 'brex', stats.cardError ? 'warning' : 'ok', stats.inserted + ' new, ' + stats.updated + ' updated' + (stats.skipped ? ', ' + stats.skipped + ' skipped' : '') + cardNote);
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
