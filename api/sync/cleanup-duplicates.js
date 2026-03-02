const { getServiceClient, verifyUserToken, cors } = require('../_lib/supabase');

/**
 * POST /api/sync/cleanup-duplicates
 * Cleanup:
 * 1. All records dated BEFORE 2026-02-28 were already handled via CSV.
 *    - Delete any new-source duplicates (zoho_books, zoho_payments, mercury)
 *    - For brex: deduplicate keeping the matched version
 *    - Mark remaining pre-Feb-28 unmatched records as 'excluded'
 * 2. Cross-source duplicate removal: if a live-source record (any date) matches
 *    a CSV record by date+amount, delete the live-source duplicate (keeps the
 *    user's matched/split CSV version).
 * 3. Restore 'matched' status on any record that has client_id but status='unmatched'
 */
module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const client = getServiceClient();
  const stats = { deleted: 0, excluded: 0, statusRestored: 0, crossSourceDups: 0, zohoPaymentsDeleted: 0, mercuryInflowsDeleted: 0, brexTransfersDeleted: 0, brexSettlementsDeleted: 0, zohoVendorPaymentsDeleted: 0, zohoBillsDeleted: 0, zohoExpensesDeleted: 0, mercuryTransfersDeleted: 0, errors: [] };
  const CUTOFF = '2026-02-28';

  try {
    // 1. Get all finance payments for this user
    const { data: allPayments, error: fetchErr } = await client
      .from('finance_payments')
      .select('id, source, source_id, date, amount, payer_email, payer_name, status, client_id, type, direction, metadata, description')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (fetchErr) throw fetchErr;

    const toDelete = new Set();

    // Sources from live sync vs CSV imports
    const liveSources = ['zoho_books', 'zoho_payments', 'mercury'];
    const csvSources = ['stripe', 'stripe2', 'zoho', 'brex'];

    // 2. Delete ALL live-source records dated before cutoff (these are duplicates of CSV data)
    for (const rec of allPayments) {
      if (liveSources.includes(rec.source) && rec.date && rec.date < CUTOFF) {
        toDelete.add(rec.id);
      }
    }

    // 3. Cross-source duplicate removal (ANY date, not just pre-cutoff).
    //    Build an index of CSV/existing records by date+amount+direction.
    //    If a live-source record matches, it's a duplicate — delete the live-source version.
    const csvByDateAmt = {};
    for (const rec of allPayments) {
      if (!csvSources.includes(rec.source)) continue;
      if (!rec.date) continue;
      const amt = Math.abs(parseFloat(rec.amount) || 0).toFixed(2);
      const key = rec.date + '|' + amt + '|' + (rec.direction || '');
      if (!csvByDateAmt[key]) csvByDateAmt[key] = [];
      csvByDateAmt[key].push(rec);
    }

    for (const rec of allPayments) {
      if (!liveSources.includes(rec.source)) continue;
      if (toDelete.has(rec.id)) continue; // already marked for deletion
      if (!rec.date) continue;
      const amt = Math.abs(parseFloat(rec.amount) || 0).toFixed(2);
      const key = rec.date + '|' + amt + '|' + (rec.direction || '');
      if (csvByDateAmt[key] && csvByDateAmt[key].length > 0) {
        toDelete.add(rec.id);
        stats.crossSourceDups++;
      }
    }

    // 4. Also delete live-source records with NO date that are duplicates
    //    (Zoho Payments records with null dates — match by amount to CSV records)
    const csvAmtIndex = {};
    for (const rec of allPayments) {
      if (!csvSources.includes(rec.source)) continue;
      const amt = Math.abs(parseFloat(rec.amount) || 0).toFixed(2);
      if (!csvAmtIndex[amt]) csvAmtIndex[amt] = 0;
      csvAmtIndex[amt]++;
    }
    for (const rec of allPayments) {
      if (!liveSources.includes(rec.source)) continue;
      if (toDelete.has(rec.id)) continue;
      if (rec.date) continue; // handled above
      const amt = Math.abs(parseFloat(rec.amount) || 0).toFixed(2);
      if (csvAmtIndex[amt]) {
        toDelete.add(rec.id);
      }
    }

    // 5. Deduplicate Brex records (same date + amount, keep matched version)
    const brexByKey = {};
    for (const rec of allPayments) {
      if (rec.source !== 'brex' || toDelete.has(rec.id)) continue;
      const key = (rec.date || 'nodate') + '|' + Math.abs(parseFloat(rec.amount) || 0).toFixed(2);
      if (!brexByKey[key]) brexByKey[key] = [];
      brexByKey[key].push(rec);
    }
    for (const key of Object.keys(brexByKey)) {
      const group = brexByKey[key];
      if (group.length <= 1) continue;
      group.sort((a, b) => {
        if (a.status === 'matched' && b.status !== 'matched') return -1;
        if (b.status === 'matched' && a.status !== 'matched') return 1;
        if (a.client_id && !b.client_id) return -1;
        if (b.client_id && !a.client_id) return 1;
        return 0;
      });
      for (let i = 1; i < group.length; i++) {
        toDelete.add(group[i].id);
      }
    }

    // 5b. Deduplicate Zoho Books records (same source, same date+amount+direction, keep matched)
    const zohoByKey = {};
    for (const rec of allPayments) {
      if (rec.source !== 'zoho_books' || toDelete.has(rec.id)) continue;
      const key = (rec.date || 'nodate') + '|' + Math.abs(parseFloat(rec.amount) || 0).toFixed(2) + '|' + (rec.direction || '');
      if (!zohoByKey[key]) zohoByKey[key] = [];
      zohoByKey[key].push(rec);
    }
    for (const key of Object.keys(zohoByKey)) {
      const group = zohoByKey[key];
      if (group.length <= 1) continue;
      group.sort((a, b) => {
        if (a.status === 'matched' && b.status !== 'matched') return -1;
        if (b.status === 'matched' && a.status !== 'matched') return 1;
        if (a.client_id && !b.client_id) return -1;
        if (b.client_id && !a.client_id) return 1;
        return 0;
      });
      for (let i = 1; i < group.length; i++) {
        toDelete.add(group[i].id);
      }
    }

    // 6. Delete in batches
    const deleteIds = Array.from(toDelete);
    for (let i = 0; i < deleteIds.length; i += 50) {
      const batch = deleteIds.slice(i, i + 50);
      const { error: delErr } = await client
        .from('finance_payments')
        .delete()
        .in('id', batch);
      if (delErr) stats.errors.push('Delete error: ' + delErr.message);
      else stats.deleted += batch.length;
    }

    // 7. Mark remaining unmatched records before cutoff as 'excluded'
    //    (These are CSV records that were already processed)
    const { data: preExisting, error: peErr } = await client
      .from('finance_payments')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'unmatched')
      .lt('date', CUTOFF);

    if (!peErr && preExisting && preExisting.length > 0) {
      const ids = preExisting.map(r => r.id);
      for (let i = 0; i < ids.length; i += 50) {
        const batch = ids.slice(i, i + 50);
        const { error: upErr } = await client
          .from('finance_payments')
          .update({ status: 'excluded' })
          .in('id', batch);
        if (upErr) stats.errors.push('Exclude error: ' + upErr.message);
        else stats.excluded += batch.length;
      }
    }

    // 8. Restore 'matched' on records that have client_id but status='unmatched'
    const { data: wrongStatus, error: wsErr } = await client
      .from('finance_payments')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'unmatched')
      .not('client_id', 'is', null)
      .neq('client_id', '');

    if (!wsErr && wrongStatus && wrongStatus.length > 0) {
      const ids = wrongStatus.map(r => r.id);
      for (let i = 0; i < ids.length; i += 50) {
        const batch = ids.slice(i, i + 50);
        const { error: upErr } = await client
          .from('finance_payments')
          .update({ status: 'matched' })
          .in('id', batch);
        if (upErr) stats.errors.push('Status restore error: ' + upErr.message);
        else stats.statusRestored += batch.length;
      }
    }

    // 9. Deactivate Zoho Payments integration (all records duplicate Zoho Books)
    await client
      .from('integration_credentials')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('platform', 'zoho_payments');

    // 10. Delete ALL zoho_payments records (every one is a duplicate of Zoho Books)
    const { data: zpRecs } = await client
      .from('finance_payments')
      .select('id')
      .eq('user_id', userId)
      .eq('source', 'zoho_payments');

    if (zpRecs && zpRecs.length > 0) {
      const zpIds = zpRecs.map(r => r.id);
      for (let i = 0; i < zpIds.length; i += 50) {
        const batch = zpIds.slice(i, i + 50);
        const { error: zpDelErr } = await client.from('finance_payments').delete().in('id', batch);
        if (zpDelErr) stats.errors.push('ZP delete error: ' + zpDelErr.message);
        else { stats.deleted += batch.length; stats.zohoPaymentsDeleted += batch.length; }
      }
    }

    // 11. Delete ALL Mercury inflow records (they duplicate Zoho Books customer payments)
    const { data: mercInflows } = await client
      .from('finance_payments')
      .select('id')
      .eq('user_id', userId)
      .eq('source', 'mercury')
      .eq('direction', 'inflow');

    if (mercInflows && mercInflows.length > 0) {
      const miIds = mercInflows.map(r => r.id);
      for (let i = 0; i < miIds.length; i += 50) {
        const batch = miIds.slice(i, i + 50);
        const { error: miDelErr } = await client.from('finance_payments').delete().in('id', batch);
        if (miDelErr) stats.errors.push('Mercury inflow delete error: ' + miDelErr.message);
        else { stats.deleted += batch.length; stats.mercuryInflowsDeleted += batch.length; }
      }
    }

    // 11b. Get Brex account names for internal transfer detection
    const { data: brexAcctBals } = await client
      .from('account_balances')
      .select('account_name')
      .eq('user_id', userId)
      .eq('platform', 'brex');
    const brexAcctNames = (brexAcctBals || []).map(r => (r.account_name || '').toLowerCase()).filter(Boolean);

    function isBrexInternalOrNoise(desc) {
      const d = (desc || '').toLowerCase();
      if (d.includes('payment') && d.includes('thank you')) return true;
      for (let i = 0; i < brexAcctNames.length; i++) {
        if (d.startsWith(brexAcctNames[i])) return true;
      }
      return false;
    }

    // 12-17. Delete noise records (transfers, settlements, vendor payments, bills, expenses)
    // Safety: skip records the user has already acted on (matched, split, or assigned to client)
    const noiseToDelete = new Set();

    for (const rec of allPayments) {
      if (rec.status === 'matched' || rec.status === 'split' || rec.client_id) continue;

      // 12. Brex internal transfers (both directions)
      if (rec.source === 'brex' && rec.type === 'transfer') {
        noiseToDelete.add(rec.id);
        stats.brexTransfersDeleted++;
      }

      // 13. Brex card settlement sweeps (daily aggregate debits like "Brex Card -$6,040.64")
      if (rec.source === 'brex' && rec.direction === 'outflow') {
        let meta = {};
        try { meta = typeof rec.metadata === 'string' ? JSON.parse(rec.metadata || '{}') : (rec.metadata || {}); } catch(e) {}
        if (meta.brex_type === 'cash') {
          const desc = (rec.description || rec.payer_name || '').toLowerCase();
          if (desc === 'brex card' || desc.startsWith('brex card ')) {
            noiseToDelete.add(rec.id);
            stats.brexSettlementsDeleted++;
          }
        }
      }

      // 13b. Brex internal transfers (description starts with account name) + balance clears
      if (rec.source === 'brex') {
        const desc = rec.description || rec.payer_name || '';
        if (isBrexInternalOrNoise(desc)) {
          noiseToDelete.add(rec.id);
          stats.brexTransfersDeleted++;
        }
      }

      // 14. Zoho Books vendor payments (duplicate bank outflows)
      if (rec.source === 'zoho_books' && rec.type === 'payment' && rec.direction === 'outflow') {
        noiseToDelete.add(rec.id);
        stats.zohoVendorPaymentsDeleted++;
      }

      // 15. Zoho Books bills (documents, not transactions)
      if (rec.source === 'zoho_books' && rec.type === 'bill') {
        noiseToDelete.add(rec.id);
        stats.zohoBillsDeleted++;
      }

      // 16. Zoho Books expenses (duplicate card/bank transactions)
      if (rec.source === 'zoho_books' && rec.type === 'expense') {
        noiseToDelete.add(rec.id);
        stats.zohoExpensesDeleted++;
      }

      // 17. Mercury internal transfers
      if (rec.source === 'mercury' && rec.type === 'transfer') {
        noiseToDelete.add(rec.id);
        stats.mercuryTransfersDeleted++;
      }
    }

    // Delete noise records in batches
    const noiseIds = Array.from(noiseToDelete);
    for (let i = 0; i < noiseIds.length; i += 50) {
      const batch = noiseIds.slice(i, i + 50);
      const { error: noiseDelErr } = await client.from('finance_payments').delete().in('id', batch);
      if (noiseDelErr) stats.errors.push('Noise delete error: ' + noiseDelErr.message);
      else stats.deleted += batch.length;
    }

    return res.status(200).json({
      success: true,
      deleted: stats.deleted,
      crossSourceDups: stats.crossSourceDups,
      zohoPaymentsDeleted: stats.zohoPaymentsDeleted,
      mercuryInflowsDeleted: stats.mercuryInflowsDeleted,
      brexTransfersDeleted: stats.brexTransfersDeleted,
      brexSettlementsDeleted: stats.brexSettlementsDeleted,
      zohoVendorPaymentsDeleted: stats.zohoVendorPaymentsDeleted,
      zohoBillsDeleted: stats.zohoBillsDeleted,
      zohoExpensesDeleted: stats.zohoExpensesDeleted,
      mercuryTransfersDeleted: stats.mercuryTransfersDeleted,
      excluded: stats.excluded,
      statusRestored: stats.statusRestored,
      errors: stats.errors
    });
  } catch (e) {
    return res.status(200).json({ success: false, error: e.message });
  }
};
