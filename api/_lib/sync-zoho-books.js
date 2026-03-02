const { getCredentials, updateSyncStatus, logSync, upsertPayment } = require('./supabase');
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
  const stats = { fetched: 0, inserted: 0, updated: 0, skipped: 0, error: '' };

  // For incremental syncs use last_sync_at; for first sync fetch everything.
  // Also treat it as a first sync if last sync found nothing (last_sync_message starts with '0 new')
  const lastMsg = cred.last_sync_message || '';
  const hadData = cred.last_sync_at && !lastMsg.startsWith('0 new, 0 updated');
  const since = hadData
    ? new Date(cred.last_sync_at).toISOString().split('T')[0]
    : null;

  try {
    // 1. Invoices (inflow — represents money owed to us)
    await syncEntity(userId, headers, orgId, since, stats, {
      endpoint: '/invoices',
      listKey: 'invoices',
      entityPrefix: 'inv',
      idField: 'invoice_id',
      direction: 'inflow',
      type: 'invoice',
      transform: (inv) => ({
        date: inv.date || null,
        amount: parseFloat(inv.total) || 0,
        fee: 0,
        net: parseFloat(inv.total) || 0,
        payer_email: inv.email || '',
        payer_name: inv.customer_name || '',
        description: (inv.invoice_number || '') + (inv.reference_number ? ' - ' + inv.reference_number : ''),
        external_status: (inv.status || '').toLowerCase(),
        pending_amount: (inv.status === 'sent' || inv.status === 'overdue') ? (parseFloat(inv.balance) || 0) : 0,
        metadata: JSON.stringify({ zoho_customer_id: inv.customer_id, invoice_number: inv.invoice_number })
      })
    });

    await delay(700);

    // 2. Customer Payments (inflow — money received from customers)
    await syncEntity(userId, headers, orgId, since, stats, {
      endpoint: '/customerpayments',
      listKey: 'customerpayments',
      entityPrefix: 'cpay',
      idField: 'payment_id',
      direction: 'inflow',
      type: 'payment',
      transform: (pay) => ({
        date: pay.date || null,
        amount: parseFloat(pay.amount) || 0,
        fee: 0,
        net: parseFloat(pay.amount) || 0,
        payer_email: pay.email || '',
        payer_name: pay.customer_name || '',
        description: pay.payment_number || pay.reference_number || '',
        external_status: '',
        pending_amount: 0,
        metadata: JSON.stringify({ zoho_customer_id: pay.customer_id, payment_mode: pay.payment_mode })
      })
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
    const url = ZOHO_BOOKS_BASE + cfg.endpoint
      + '?organization_id=' + orgId
      + sortPart
      + dateFilterPart
      + '&page=' + page + '&per_page=200';

    const resp = await fetch(url, { headers });
    if (!resp.ok) {
      const body = await resp.text();
      throw new Error('Zoho Books ' + cfg.endpoint + ' API: ' + resp.status + ' — ' + body.substring(0, 200));
    }

    const data = await resp.json();
    const items = data[cfg.listKey] || [];
    stats.fetched += items.length;

    for (const item of items) {
      const sourceId = cfg.entityPrefix + '_' + item[cfg.idField];
      const transformed = cfg.transform(item);

      // Skip records before CSV cutoff
      if (transformed.date && transformed.date < CSV_CUTOFF) { stats.skipped++; continue; }

      const result = await upsertPayment(userId, 'zoho_books', sourceId, {
        ...transformed,
        direction: cfg.direction,
        type: cfg.type,
        category: '',
        status: 'unmatched'
      });

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
