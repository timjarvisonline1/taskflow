const { getCredentials, updateSyncStatus, logSync, upsertPayment } = require('./supabase');
const { refreshZohoToken } = require('./zoho-auth');

const ZOHO_BOOKS_BASE = 'https://www.zohoapis.com/books/v3';

/* Delay helper for rate limiting (Zoho Books: 100 req/min) */
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function syncZohoBooks(userId) {
  const cred = await getCredentials(userId, 'zoho_books');
  if (!cred) throw new Error('Zoho Books not connected');

  const orgId = (cred.config || {}).organization_id;
  if (!orgId) throw new Error('Zoho Books organization_id missing');

  const accessToken = await refreshZohoToken(cred, 'zoho_books');
  const headers = { 'Authorization': 'Zoho-oauthtoken ' + accessToken };
  const stats = { fetched: 0, inserted: 0, updated: 0, error: '' };

  // Use last_sync_at or default to 90 days ago
  const since = cred.last_sync_at
    ? new Date(cred.last_sync_at).toISOString().split('T')[0]
    : new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];

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

    await delay(700);

    // 3. Vendor Payments (outflow — money paid to vendors)
    await syncEntity(userId, headers, orgId, since, stats, {
      endpoint: '/vendorpayments',
      listKey: 'vendorpayments',
      entityPrefix: 'vpay',
      idField: 'payment_id',
      direction: 'outflow',
      type: 'payment',
      transform: (pay) => ({
        date: pay.date || null,
        amount: parseFloat(pay.amount) || 0,
        fee: 0,
        net: parseFloat(pay.amount) || 0,
        payer_email: '',
        payer_name: pay.vendor_name || '',
        description: pay.payment_number || pay.reference_number || '',
        external_status: '',
        pending_amount: 0,
        metadata: JSON.stringify({ zoho_vendor_id: pay.vendor_id, payment_mode: pay.payment_mode })
      })
    });

    await delay(700);

    // 4. Bills (outflow — money owed to vendors)
    await syncEntity(userId, headers, orgId, since, stats, {
      endpoint: '/bills',
      listKey: 'bills',
      entityPrefix: 'bill',
      idField: 'bill_id',
      direction: 'outflow',
      type: 'bill',
      transform: (bill) => ({
        date: bill.date || null,
        amount: parseFloat(bill.total) || 0,
        fee: 0,
        net: parseFloat(bill.total) || 0,
        payer_email: '',
        payer_name: bill.vendor_name || '',
        description: (bill.bill_number || '') + (bill.reference_number ? ' - ' + bill.reference_number : ''),
        external_status: (bill.status || '').toLowerCase(),
        pending_amount: (bill.status === 'open' || bill.status === 'overdue') ? (parseFloat(bill.balance) || 0) : 0,
        metadata: JSON.stringify({ zoho_vendor_id: bill.vendor_id, bill_number: bill.bill_number })
      })
    });

    await delay(700);

    // 5. Expenses (outflow — direct expenses)
    await syncEntity(userId, headers, orgId, since, stats, {
      endpoint: '/expenses',
      listKey: 'expenses',
      entityPrefix: 'exp',
      idField: 'expense_id',
      direction: 'outflow',
      type: 'expense',
      transform: (exp) => ({
        date: exp.date || null,
        amount: parseFloat(exp.total) || 0,
        fee: 0,
        net: parseFloat(exp.total) || 0,
        payer_email: '',
        payer_name: exp.vendor_name || exp.merchant_name || '',
        description: exp.description || exp.reference_number || '',
        external_status: (exp.status || '').toLowerCase(),
        pending_amount: 0,
        metadata: JSON.stringify({ expense_type: exp.expense_type, account_name: exp.account_name })
      })
    });

    await updateSyncStatus(userId, 'zoho_books', 'ok', stats.inserted + ' new, ' + stats.updated + ' updated');
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
    const url = ZOHO_BOOKS_BASE + cfg.endpoint
      + '?organization_id=' + orgId
      + '&sort_column=last_modified_time&sort_order=D'
      + '&last_modified_time=' + encodeURIComponent(since + 'T00:00:00+0000')
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

      const result = await upsertPayment(userId, 'zoho_books', sourceId, {
        ...transformed,
        direction: cfg.direction,
        type: cfg.type,
        category: '',
        status: 'unmatched'
      });

      if (result.action === 'inserted') stats.inserted++;
      else if (result.action === 'updated') stats.updated++;
    }

    hasMore = data.page_context ? data.page_context.has_more_page : false;
    page++;

    if (hasMore) await delay(700); // Rate limit: ~1 req/700ms
  }
}

module.exports = { syncZohoBooks };
