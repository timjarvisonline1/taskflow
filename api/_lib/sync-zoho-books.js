const { getCredentials, getServiceClient, updateSyncStatus, logSync, upsertPayment } = require('./supabase');
const { refreshZohoToken } = require('./zoho-auth');

const ZOHO_BOOKS_BASE = 'https://www.zohoapis.com/books/v3';
const CSV_CUTOFF = '2026-02-28'; // All data before this date was imported via CSV — never re-sync

/* Delay helper for rate limiting (Zoho Books: 100 req/min) */
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function syncZohoBooks(userId) {
  const cred = await getCredentials(userId, 'zoho_books');
  if (!cred) throw new Error('Zoho Books not connected');

  const orgId = (cred.config || {}).organization_id;
  if (!orgId) throw new Error('Zoho Books organization_id missing');

  const accessToken = await refreshZohoToken(cred, 'zoho_books');
  const headers = { 'Authorization': 'Zoho-oauthtoken ' + accessToken };
  const stats = { fetched: 0, inserted: 0, updated: 0, skipped: 0, error: '', debug: [] };

  // For incremental syncs use last_sync_at; for first sync fetch everything.
  // Also treat it as a first sync if last sync found nothing (last_sync_message starts with '0 new')
  const lastMsg = cred.last_sync_message || '';
  const hadData = cred.last_sync_at && !lastMsg.startsWith('0 new, 0 updated');
  const since = hadData
    ? new Date(cred.last_sync_at).toISOString().split('T')[0]
    : null;

  stats.debug.push('since=' + (since || 'FULL_SYNC') + ', lastSync=' + (cred.last_sync_at || 'never') + ', lastMsg=' + lastMsg);

  try {
    // 1. Invoices — only fetch outstanding (sent/overdue/unpaid/partially_paid)
    // No need to sync paid invoices — the funds are already received and matched.
    stats.invoiceFetchedIds = [];
    await syncEntity(userId, headers, orgId, null, stats, {
      endpoint: '/invoices',
      listKey: 'invoices',
      entityPrefix: 'inv',
      idField: 'invoice_id',
      direction: 'inflow',
      type: 'invoice',
      extraParams: 'status=sent,overdue,unpaid,partially_paid',
      transform: (inv) => ({
        date: inv.date || null,
        amount: parseFloat(inv.total) || 0,
        fee: 0,
        net: parseFloat(inv.total) || 0,
        payer_email: inv.email || '',
        payer_name: inv.customer_name || '',
        description: (inv.invoice_number || '') + (inv.reference_number ? ' - ' + inv.reference_number : ''),
        external_status: (inv.status || '').toLowerCase(),
        pending_amount: parseFloat(inv.balance) || 0,
        metadata: JSON.stringify({ zoho_customer_id: inv.customer_id, invoice_number: inv.invoice_number })
      })
    });

    // Cleanup: mark local outstanding invoices that Zoho no longer returns as paid
    // (they were paid/voided since our last sync)
    const svc = getServiceClient();
    const { data: localOutstanding } = await svc
      .from('finance_payments')
      .select('id, source_id')
      .eq('user_id', userId)
      .eq('source', 'zoho_books')
      .eq('type', 'invoice')
      .gt('pending_amount', 0);

    if (localOutstanding && localOutstanding.length > 0) {
      const fetchedSet = new Set(stats.invoiceFetchedIds);
      for (const rec of localOutstanding) {
        if (!fetchedSet.has(rec.source_id)) {
          await svc.from('finance_payments')
            .update({ external_status: 'paid', pending_amount: 0 })
            .eq('id', rec.id);
          stats.updated++;
          stats.debug.push('invoice ' + rec.source_id + ': marked paid (no longer outstanding in Zoho)');
        }
      }
    }

    await delay(700);

    // 2. Customer Payments (inflow — money received from customers)
    await syncEntity(userId, headers, orgId, since, stats, {
      endpoint: '/customerpayments',
      listKey: 'customerpayments',
      entityPrefix: 'cpay',
      idField: 'payment_id',
      direction: 'inflow',
      type: 'payment',
      transform: (pay) => {
        // Capture which invoices this payment covers (Zoho returns invoice refs)
        const invoiceRefs = (pay.invoices || []).map(function(inv) {
          return { invoice_id: inv.invoice_id, invoice_number: inv.invoice_number, amount_applied: inv.amount_applied };
        });
        return {
          date: pay.date || null,
          amount: parseFloat(pay.amount) || 0,
          fee: 0,
          net: parseFloat(pay.amount) || 0,
          payer_email: pay.email || '',
          payer_name: pay.customer_name || '',
          description: (pay.payment_number || pay.reference_number || '') + (invoiceRefs.length ? ' (Inv: ' + invoiceRefs.map(function(r) { return r.invoice_number }).filter(Boolean).join(', ') + ')' : ''),
          external_status: '',
          pending_amount: 0,
          metadata: JSON.stringify({ zoho_customer_id: pay.customer_id, payment_mode: pay.payment_mode, invoices: invoiceRefs })
        };
      }
    });

    // Vendor payments, bills, and expenses are NOT synced — they duplicate bank/card transactions.
    // Revenue source of truth: Zoho Books invoices + customer payments.
    // Expense source of truth: Brex card transactions + Mercury/Brex bank outflows.

    const msg = stats.inserted + ' new, ' + stats.updated + ' updated' + (stats.skipped ? ', ' + stats.skipped + ' skipped' : '');
    await updateSyncStatus(userId, 'zoho_books', 'ok', msg);
    await logSync(userId, 'zoho_books', 'poll', stats);
    return stats;
  } catch (e) {
    stats.error = e.message;
    await updateSyncStatus(userId, 'zoho_books', 'error', e.message);
    await logSync(userId, 'zoho_books', 'poll', stats);
    throw e;
  }
}

/* Generic paginated entity sync */
async function syncEntity(userId, headers, orgId, since, stats, cfg) {
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    let sortPart = '';
    let dateFilterPart = '';
    if (since) {
      // Only add sort + date filter for incremental syncs
      const sortCol = cfg.sortColumn || 'last_modified_time';
      sortPart = '&sort_column=' + sortCol + '&sort_order=D';
      dateFilterPart = cfg.dateFilter
        ? '&' + cfg.dateFilter
        : '&last_modified_time=' + encodeURIComponent(since + 'T00:00:00+0000');
    }
    const extraPart = cfg.extraParams ? '&' + cfg.extraParams : '';
    const url = ZOHO_BOOKS_BASE + cfg.endpoint
      + '?organization_id=' + orgId
      + sortPart
      + dateFilterPart
      + extraPart
      + '&page=' + page + '&per_page=200';

    const resp = await fetch(url, { headers });
    if (!resp.ok) {
      const body = await resp.text();
      throw new Error('Zoho Books ' + cfg.endpoint + ' API: ' + resp.status + ' — ' + body.substring(0, 200));
    }

    const data = await resp.json();
    const items = data[cfg.listKey] || [];
    stats.fetched += items.length;
    stats.debug.push(cfg.endpoint + ' page ' + page + ': ' + items.length + ' items from Zoho' + (data.page_context ? ' (has_more=' + data.page_context.has_more_page + ')' : ''));

    for (const item of items) {
      const sourceId = cfg.entityPrefix + '_' + item[cfg.idField];
      if (cfg.type === 'invoice' && stats.invoiceFetchedIds) {
        stats.invoiceFetchedIds.push(sourceId);
      }
      const transformed = cfg.transform(item);

      // Skip records before CSV cutoff — but NEVER skip outstanding invoices
      // (the user needs to see ALL unpaid invoices regardless of date)
      const isOutstandingInvoice = cfg.type === 'invoice' && transformed.pending_amount > 0;
      if (!isOutstandingInvoice && transformed.date && transformed.date < CSV_CUTOFF) { stats.skipped++; continue; }

      const result = await upsertPayment(userId, 'zoho_books', sourceId, {
        ...transformed,
        direction: cfg.direction,
        type: cfg.type,
        category: '',
        status: 'unmatched'
      });

      // Log each record's outcome for debugging
      stats.debug.push(cfg.type + ' ' + sourceId + ': ' + result.action + ' | ' + (transformed.payer_name || '').substring(0, 25) + ' | $' + (transformed.amount || 0) + ' | ' + (transformed.date || 'no-date') + (isOutstandingInvoice ? ' [OUTSTANDING]' : '') + (transformed.external_status ? ' [' + transformed.external_status + ']' : ''));

      if (result.action === 'inserted') stats.inserted++;
      else if (result.action === 'updated') stats.updated++;
      else if (result.action === 'skipped') stats.skipped++;
    }

    hasMore = data.page_context ? data.page_context.has_more_page : false;
    page++;

    if (hasMore) await delay(700); // Rate limit: ~1 req/700ms
  }
}

module.exports = { syncZohoBooks };
