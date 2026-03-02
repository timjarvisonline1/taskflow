const { getCredentials, updateSyncStatus, logSync, upsertPayment } = require('./supabase');
const { refreshZohoToken } = require('./zoho-auth');

const ZOHO_PAY_BASE = 'https://payments.zoho.com/api/v1';

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

/* Convert various date formats to YYYY-MM-DD string */
function parseDate(val) {
  if (!val) return null;
  // Unix timestamp (all digits, 10-13 chars)
  if (/^\d{10,13}$/.test(String(val))) {
    const ms = String(val).length <= 10 ? Number(val) * 1000 : Number(val);
    return new Date(ms).toISOString().split('T')[0];
  }
  const s = String(val);
  // ISO datetime (contains T)
  if (s.includes('T')) return s.split('T')[0];
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // Try parsing as date
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return null;
}

async function syncZohoPayments(userId) {
  const cred = await getCredentials(userId, 'zoho_payments');
  if (!cred) throw new Error('Zoho Payments not connected');

  const accountId = (cred.config || {}).account_id;
  if (!accountId) throw new Error('Zoho Payments account_id missing');

  const accessToken = await refreshZohoToken(cred, 'zoho_payments');
  const headers = { 'Authorization': 'Zoho-oauthtoken ' + accessToken };
  const stats = { fetched: 0, inserted: 0, updated: 0, skipped: 0, error: '' };

  try {
    // 1. Sync Payments (money received via credit card/ACH)
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const url = ZOHO_PAY_BASE + '/payments?account_id=' + accountId
        + '&per_page=200&page=' + page;

      const resp = await fetch(url, { headers });
      if (!resp.ok) throw new Error('Zoho Payments API: ' + resp.status);
      const data = await resp.json();
      const payments = (data.data || data.payments || []);
      stats.fetched += payments.length;

      for (const pay of payments) {
        const amount = parseFloat(pay.amount) || 0;
        const fee = parseFloat(pay.fee_amount || pay.fee || 0);

        // Try multiple date field names — Zoho may return Unix timestamps
        const payDate = pay.date || pay.payment_date || pay.paid_at || pay.created_time || pay.created_date || null;
        const dateStr = parseDate(payDate);

        const result = await upsertPayment(userId, 'zoho_payments', pay.payment_id, {
          date: dateStr,
          amount: amount,
          fee: fee,
          net: amount - fee,
          direction: 'inflow',
          type: 'payment',
          payer_email: pay.receipt_email || pay.email || '',
          payer_name: pay.card_holder_name || pay.customer_name || '',
          description: pay.description || '',
          category: '',
          external_status: (pay.status || '').toLowerCase(),
          pending_amount: 0,
          metadata: JSON.stringify({
            payment_method: pay.payment_method_type || '',
            currency: pay.currency || 'USD',
            zoho_customer_id: pay.customer_id || ''
          }),
          status: 'unmatched'
        });

        if (result.action === 'inserted') stats.inserted++;
        else if (result.action === 'updated') stats.updated++;
        else if (result.action === 'skipped') stats.skipped++;
      }

      // Check pagination — Zoho Payments uses page_context or simple page count
      hasMore = payments.length === 200;
      page++;
      if (hasMore) await delay(200);
    }

    await delay(500);

    // 2. Sync Payouts (funds disbursed to bank account)
    // Note: Payouts require a separate scope that may not be available.
    // If the API returns 401/403, skip payouts gracefully.
    try {
      page = 1;
      hasMore = true;

      while (hasMore) {
        const url = ZOHO_PAY_BASE + '/payouts?account_id=' + accountId
          + '&per_page=200&page=' + page;

        const resp = await fetch(url, { headers });
        if (resp.status === 401 || resp.status === 403) {
          // No payouts scope — skip silently
          break;
        }
        if (!resp.ok) throw new Error('Zoho Payouts API: ' + resp.status);
        const data = await resp.json();
        const payouts = (data.data || data.payouts || []);
        stats.fetched += payouts.length;

        for (const po of payouts) {
          const amount = parseFloat(po.amount) || 0;
          const sourceId = 'payout_' + po.payout_id;
          const poStatus = (po.status || '').toLowerCase();
          const isPending = (poStatus === 'initiated' || poStatus === 'in_transit');

          const poDate = po.arrival_date || po.date || po.payout_date || po.created_time || po.created_date || null;
          const poDateStr = parseDate(poDate);

          const result = await upsertPayment(userId, 'zoho_payments', sourceId, {
            date: poDateStr,
            amount: amount,
            fee: 0,
            net: amount,
            direction: 'inflow',
            type: 'payout',
            payer_email: '',
            payer_name: 'Zoho Payments Payout',
            description: 'Payout ' + (po.payout_id || ''),
            category: '',
            external_status: poStatus,
            pending_amount: isPending ? amount : 0,
            metadata: JSON.stringify({
              payout_id: po.payout_id,
              arrival_date: po.arrival_date || '',
              payment_count: po.payment_count || 0
            }),
            status: 'unmatched'
          });

          if (result.action === 'inserted') stats.inserted++;
          else if (result.action === 'updated') stats.updated++;
          else if (result.action === 'skipped') stats.skipped++;
        }

        hasMore = payouts.length === 200;
        page++;
        if (hasMore) await delay(200);
      }
    } catch (payoutErr) {
      // Log but don't fail the entire sync if payouts can't be fetched
      console.log('Payouts sync skipped: ' + payoutErr.message);
    }

    const msg = stats.inserted + ' new, ' + stats.updated + ' updated' + (stats.skipped ? ', ' + stats.skipped + ' skipped (cross-source dups)' : '');
    await updateSyncStatus(userId, 'zoho_payments', 'ok', msg);
    await logSync(userId, 'zoho_payments', 'poll', stats);
    return stats;
  } catch (e) {
    stats.error = e.message;
    await updateSyncStatus(userId, 'zoho_payments', 'error', e.message);
    await logSync(userId, 'zoho_payments', 'poll', stats);
    throw e;
  }
}

/* Process a Zoho Payments webhook event */
async function processZohoPaymentWebhook(userId, event) {
  const eventType = event.event_type || '';
  const obj = event.event_object || event.data || {};
  const stats = { fetched: 1, inserted: 0, updated: 0 };

  if (eventType.startsWith('payment.')) {
    const pay = obj;
    const amount = parseFloat(pay.amount) || 0;
    const fee = parseFloat(pay.fee_amount || pay.fee || 0);

    const result = await upsertPayment(userId, 'zoho_payments', pay.payment_id, {
      date: pay.created_time ? pay.created_time.split('T')[0] : null,
      amount: amount,
      fee: fee,
      net: amount - fee,
      direction: 'inflow',
      type: 'payment',
      payer_email: pay.receipt_email || pay.email || '',
      payer_name: pay.card_holder_name || pay.customer_name || '',
      description: pay.description || '',
      external_status: (pay.status || '').toLowerCase(),
      pending_amount: 0,
      metadata: JSON.stringify({ payment_method: pay.payment_method_type || '', webhook_event: eventType }),
      status: 'unmatched'
    });

    stats.inserted = result.action === 'inserted' ? 1 : 0;
    stats.updated = result.action === 'updated' ? 1 : 0;

  } else if (eventType.startsWith('payout.')) {
    const po = obj;
    const amount = parseFloat(po.amount) || 0;
    const sourceId = 'payout_' + po.payout_id;
    const poStatus = (po.status || '').toLowerCase();
    const isPending = (poStatus === 'initiated' || poStatus === 'in_transit');

    const result = await upsertPayment(userId, 'zoho_payments', sourceId, {
      date: po.arrival_date || null,
      amount: amount,
      fee: 0,
      net: amount,
      direction: 'inflow',
      type: 'payout',
      payer_email: '',
      payer_name: 'Zoho Payments Payout',
      description: 'Payout ' + (po.payout_id || ''),
      external_status: poStatus,
      pending_amount: isPending ? amount : 0,
      metadata: JSON.stringify({ payout_id: po.payout_id, arrival_date: po.arrival_date || '', webhook_event: eventType }),
      status: 'unmatched'
    });

    stats.inserted = result.action === 'inserted' ? 1 : 0;
    stats.updated = result.action === 'updated' ? 1 : 0;
  }

  await logSync(userId, 'zoho_payments', 'webhook', stats);
  return stats;
}

module.exports = { syncZohoPayments, processZohoPaymentWebhook };
