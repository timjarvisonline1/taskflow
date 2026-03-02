const { verifyUserToken, getCredentials } = require('../_lib/supabase');
const { refreshZohoToken } = require('../_lib/zoho-auth');
const { cors } = require('../_lib/supabase');

const ZOHO_BOOKS_BASE = 'https://www.zohoapis.com/books/v3';

/**
 * POST /api/sync/zoho-books-debug
 * Debug endpoint: fetches raw data from Zoho Books API and returns it
 * WITHOUT upserting anything. Always does a full fetch (ignores incremental).
 */
module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const cred = await getCredentials(userId, 'zoho_books');
    if (!cred) return res.status(200).json({ error: 'Zoho Books not connected' });

    const orgId = (cred.config || {}).organization_id;
    if (!orgId) return res.status(200).json({ error: 'organization_id missing' });

    const accessToken = await refreshZohoToken(cred, 'zoho_books');
    const headers = { 'Authorization': 'Zoho-oauthtoken ' + accessToken };

    const result = {
      syncConfig: {
        last_sync_at: cred.last_sync_at || null,
        last_sync_message: cred.last_sync_message || '',
        org_id: orgId
      },
      invoices: [],
      customerPayments: [],
      errors: []
    };

    // Fetch ALL invoices (no date filter)
    try {
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const url = ZOHO_BOOKS_BASE + '/invoices?organization_id=' + orgId + '&page=' + page + '&per_page=200';
        const resp = await fetch(url, { headers });
        if (!resp.ok) {
          const body = await resp.text();
          result.errors.push('Invoices API ' + resp.status + ': ' + body.substring(0, 300));
          break;
        }
        const data = await resp.json();
        const items = data.invoices || [];
        items.forEach(function(inv) {
          result.invoices.push({
            invoice_id: inv.invoice_id,
            invoice_number: inv.invoice_number,
            customer_name: inv.customer_name,
            customer_id: inv.customer_id,
            email: inv.email,
            date: inv.date,
            due_date: inv.due_date,
            total: inv.total,
            balance: inv.balance,
            status: inv.status,
            reference_number: inv.reference_number,
            last_modified_time: inv.last_modified_time,
            created_time: inv.created_time
          });
        });
        hasMore = data.page_context ? data.page_context.has_more_page : false;
        page++;
        if (hasMore) await new Promise(r => setTimeout(r, 700));
      }
    } catch (e) {
      result.errors.push('Invoice fetch error: ' + e.message);
    }

    // Fetch ALL customer payments (no date filter)
    try {
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const url = ZOHO_BOOKS_BASE + '/customerpayments?organization_id=' + orgId + '&page=' + page + '&per_page=200';
        const resp = await fetch(url, { headers });
        if (!resp.ok) {
          const body = await resp.text();
          result.errors.push('Customer Payments API ' + resp.status + ': ' + body.substring(0, 300));
          break;
        }
        const data = await resp.json();
        const items = data.customerpayments || [];
        items.forEach(function(pay) {
          result.customerPayments.push({
            payment_id: pay.payment_id,
            customer_name: pay.customer_name,
            customer_id: pay.customer_id,
            email: pay.email,
            date: pay.date,
            amount: pay.amount,
            payment_number: pay.payment_number,
            payment_mode: pay.payment_mode,
            reference_number: pay.reference_number,
            invoices: pay.invoices || [],
            last_modified_time: pay.last_modified_time
          });
        });
        hasMore = data.page_context ? data.page_context.has_more_page : false;
        page++;
        if (hasMore) await new Promise(r => setTimeout(r, 700));
      }
    } catch (e) {
      result.errors.push('Payment fetch error: ' + e.message);
    }

    return res.status(200).json(result);
  } catch (e) {
    return res.status(200).json({ error: e.message });
  }
};
