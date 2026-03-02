const { getCredentials, updateSyncStatus, logSync, upsertPayment, upsertAccountBalance } = require('./supabase');

const BREX_BASE = 'https://platform.brexapis.com';

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

    // Capture account balances
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

    // 2. Fetch transactions for each cash account
    // Note: Brex posted_at_start filter returns 400, so we fetch all and rely on upsert deduplication
    for (const acct of accounts) {
      let cursor = null;
      let hasMore = true;

      while (hasMore) {
        let url = BREX_BASE + '/v2/transactions/cash/' + encodeURIComponent(acct.id);
        if (cursor) url += '?cursor=' + encodeURIComponent(cursor);

        const txResp = await fetch(url, { headers });
        if (!txResp.ok) {
          const txErr = await txResp.text();
          throw new Error('Brex txns ' + txResp.status + ' (acct=' + acct.id + '): ' + txErr.substring(0, 200));
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

    // 3. Fetch card transactions from primary card account
    let cardCursor = null;
    let cardHasMore = true;

    while (cardHasMore) {
      let cardUrl = BREX_BASE + '/v2/transactions/card/primary';
      if (cardCursor) cardUrl += '?cursor=' + encodeURIComponent(cardCursor);

      const cardResp = await fetch(cardUrl, { headers });
      if (!cardResp.ok) {
        // Card endpoint may not be available for all accounts — log but don't fail
        const cardErr = await cardResp.text();
        console.log('Brex card txns ' + cardResp.status + ': ' + cardErr.substring(0, 200));
        break;
      }
      const cardData = await cardResp.json();
      const cardItems = cardData.items || [];
      stats.fetched += cardItems.length;

      for (const tx of cardItems) {
        const rawAmount = (tx.amount && tx.amount.amount) ? parseFloat(tx.amount.amount) / 100 : 0;
        const amount = Math.abs(rawAmount);
        const merchantDesc = (tx.merchant && tx.merchant.raw_descriptor) ? tx.merchant.raw_descriptor : (tx.description || '');

        const result = await upsertPayment(userId, 'brex', tx.id, {
          date: tx.posted_at_date || tx.initiated_at_date || null,
          amount: amount,
          fee: 0,
          net: amount,
          direction: 'outflow',
          type: 'expense',
          payer_email: '',
          payer_name: merchantDesc,
          description: merchantDesc,
          category: '',
          external_status: (tx.status || '').toLowerCase(),
          pending_amount: 0,
          metadata: JSON.stringify({
            brex_type: 'card',
            card_id: tx.card_id || '',
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

    await updateSyncStatus(userId, 'brex', 'ok', stats.inserted + ' new, ' + stats.updated + ' updated' + (stats.skipped ? ', ' + stats.skipped + ' skipped' : ''));
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
