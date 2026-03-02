const { getCredentials, updateSyncStatus, logSync, upsertPayment } = require('./supabase');
const { refreshZohoToken } = require('./zoho-auth');

const ZOHO_PAY_BASE = 'https://payments.zoho.com/api/v1';

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function syncZohoPayments(userId) {
  const cred = await getCredentials(userId, 'zoho_payments');
  if (!cred) throw new Error('Zoho Payments not connected');

  const accountId = (cred.config || {}).account_id;
  if (!accountId) throw new Error('Zoho Payments account_id missing');

  const accessToken = await refreshZohoToken(cred, 'zoho_payments');
  const headers = { 'Authorization': 'Zoho-oauthtoken ' + accessToken };
  const stats = { fetched: 0, inserted: 0, updated: 0, error: '' };

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

        const result = await upsertPayment(userId, 'zoho_payments', pay.payment_id, {
          date: pay.created_time ? pay.created_time.split('T')[0] : null,
          amount: amount / 100,  // Zoho Payments amounts may be in cents
          fee: fee / 100,
          net: (amount - fee) / 100,
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
      }

      // Check pagination — Zoho Payments uses page_context or simple page count
      hasMore = payments.length === 200;
      page++;
      if (hasMore) await delay(200);
    }

    await delay(500);

    // 2. Sync Payouts (funds disbursed to bank account)
    page = 1;
    hasMore = true;

    while (hasMore) {
      const url = ZOHO_PAY_BASE + '/payouts?account_id=' + accountId
        + '&per_page=200&page=' + page;

      const resp = await fetch(url, { headers });
      if (!resp.ok) throw new Error('Zoho Payouts API: ' + resp.status);
      const data = await resp.json();
      const payouts = (data.data || data.payouts || []);
      stats.fetched += payouts.length;

      for (const po of payouts) {
        const amount = parseFloat(po.amount) || 0;
        const sourceId = 'payout_' + po.payout_id;
        const poStatus = (po.status || '').toLowerCase();
        const isPending = (poStatus === 'initiated' || poStatus === 'in_transit');

        const result = await upsertPayment(userId, 'zoho_payments', sourceId, {
          date: po.arrival_date || po.created_time ? (po.arrival_date || po.created_time.split('T')[0]) : null,
          amount: amount / 100,
          fee: 0,
          net: amount / 100,
          direction: 'inflow',
          type: 'payout',
          payer_email: '',
          payer_name: 'Zoho Payments Payout',
          description: 'Payout ' + (po.payout_id || ''),
          category: '',
          external_status: poStatus,
          pending_amount: isPending ? (amount / 100) : 0,
          metadata: JSON.stringify({
            payout_id: po.payout_id,
            arrival_date: po.arrival_date || '',
            payment_count: po.payment_count || 0
          }),
          status: 'unmatched'
        });

        if (result.action === 'inserted') stats.inserted++;
        else if (result.action === 'updated') stats.updated++;
      }

      hasMore = payouts.length === 200;
      page++;
      if (hasMore) await delay(200);
    }

    await updateSyncStatus(userId, 'zoho_payments', 'ok', stats.inserted + ' new, ' + stats.updated + ' updated');
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
      amount: amount / 100,
      fee: fee / 100,
      net: (amount - fee) / 100,
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
      amount: amount / 100,
      fee: 0,
      net: amount / 100,
      direction: 'inflow',
      type: 'payout',
      payer_email: '',
      payer_name: 'Zoho Payments Payout',
      description: 'Payout ' + (po.payout_id || ''),
      external_status: poStatus,
      pending_amount: isPending ? (amount / 100) : 0,
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
