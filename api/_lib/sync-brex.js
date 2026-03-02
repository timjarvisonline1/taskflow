const { getServiceClient, getCredentials, updateSyncStatus, logSync, upsertPayment, upsertAccountBalance } = require('./supabase');

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

    // 2. Build set of account names for internal transfer detection
    const acctNames = accounts.map(function(a) { return (a.name || '').toLowerCase(); }).filter(Boolean);

    function isInternalOrNoise(desc) {
      const d = (desc || '').toLowerCase();
      if (d.includes('payment') && d.includes('thank you')) return true;
      for (let i = 0; i < acctNames.length; i++) {
        if (d.startsWith(acctNames[i])) return true;
      }
      return false;
    }

    // 3. Pre-fetch ALL existing Brex source_ids in one query.
    //    This lets us skip already-synced records instantly (no DB round-trip per record).
    //    Critical for performance: Brex API returns ALL history (no date filtering),
    //    so without this, 7000+ records × 3-4 DB queries each = 504 timeout.
    const client = getServiceClient();
    const existingIds = new Set();
    let offset = 0;
    const PAGE = 1000;
    while (true) {
      const { data: rows } = await client
        .from('finance_payments')
        .select('source_id')
        .eq('user_id', userId)
        .eq('source', 'brex')
        .range(offset, offset + PAGE - 1);
      if (!rows || rows.length === 0) break;
      rows.forEach(function(r) { if (r.source_id) existingIds.add(r.source_id); });
      if (rows.length < PAGE) break;
      offset += PAGE;
    }

    // 4. Fetch cash transactions for each account
    //    Brex API doesn't support posted_at_start on cash (returns 400),
    //    so we fetch all and skip already-synced records via existingIds.
    for (const acct of accounts) {
      let cursor = null;
      let hasMore = true;

      while (hasMore) {
        const params = [];
        if (cursor) params.push('cursor=' + encodeURIComponent(cursor));
        const url = BREX_BASE + '/v2/transactions/cash/' + encodeURIComponent(acct.id) + (params.length ? '?' + params.join('&') : '');

        const txResp = await fetch(url, { headers });
        if (!txResp.ok) {
          const txErr = await txResp.text();
          throw new Error('Brex txns ' + txResp.status + ' (acct=' + acct.id + '): ' + txErr.substring(0, 200));
        }
        const txData = await txResp.json();
        const items = txData.items || [];
        stats.fetched += items.length;

        for (const tx of items) {
          // Fast skip: already synced (no DB call needed)
          if (existingIds.has(tx.id)) { stats.skipped++; continue; }

          const rawAmount = (tx.amount && tx.amount.amount) ? parseFloat(tx.amount.amount) / 100 : 0;
          const direction = rawAmount >= 0 ? 'inflow' : 'outflow';
          const amount = Math.abs(rawAmount);
          const txDate = tx.posted_at_date || tx.initiated_at_date || null;

          // Skip records before CSV cutoff
          if (txDate && txDate < CSV_CUTOFF) { stats.skipped++; continue; }
          // Skip internal transfers (account-to-account moves)
          if (tx.type === 'TRANSFER') { stats.skipped++; continue; }
          // Skip card settlement sweeps
          const txDesc = (tx.description || '').toLowerCase();
          if (txDesc === 'brex card' || txDesc.startsWith('brex card ')) { stats.skipped++; continue; }
          // Skip internal transfers (description matches account name) + balance clears
          if (isInternalOrNoise(tx.description)) { stats.skipped++; continue; }

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

    // 5. Fetch card transactions from primary card account
    //    Brex API also returns 400 with posted_at_start on cards,
    //    so we fetch all and skip already-synced records via existingIds.
    let cardCursor = null;
    let cardHasMore = true;

    while (cardHasMore) {
      const cardParams = [];
      if (cardCursor) cardParams.push('cursor=' + encodeURIComponent(cardCursor));
      const cardUrl = BREX_BASE + '/v2/transactions/card/primary' + (cardParams.length ? '?' + cardParams.join('&') : '');

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
        // Fast skip: already synced (no DB call needed)
        if (existingIds.has(tx.id)) { stats.skipped++; continue; }

        const rawAmount = (tx.amount && tx.amount.amount) ? parseFloat(tx.amount.amount) / 100 : 0;
        const amount = Math.abs(rawAmount);
        const merchantDesc = (tx.merchant && tx.merchant.raw_descriptor) ? tx.merchant.raw_descriptor : (tx.description || '');
        // Prefer initiated_at_date (actual transaction date) over posted_at_date (settlement, +1 day)
        const cardTxDate = tx.initiated_at_date || tx.posted_at_date || null;

        // Skip records before CSV cutoff
        if (cardTxDate && cardTxDate < CSV_CUTOFF) { stats.skipped++; continue; }
        // Skip internal transfers + balance clears on card side too
        if (isInternalOrNoise(merchantDesc)) { stats.skipped++; continue; }

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
