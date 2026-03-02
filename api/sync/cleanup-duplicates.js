const { getServiceClient, verifyUserToken, cors } = require('../_lib/supabase');

/**
 * POST /api/sync/cleanup-duplicates
 * Cleanup:
 * 1. All records dated BEFORE 2026-02-28 were already handled via CSV.
 *    - Delete any new-source duplicates (zoho_books, zoho_payments, mercury)
 *    - For brex: deduplicate keeping the matched version
 *    - Mark remaining pre-Feb-28 unmatched records as 'excluded'
 * 2. Restore 'matched' status on any record that has client_id but status='unmatched'
 */
module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const client = getServiceClient();
  const stats = { deleted: 0, excluded: 0, statusRestored: 0, errors: [] };
  const CUTOFF = '2026-02-28';

  try {
    // 1. Get all finance payments for this user
    const { data: allPayments, error: fetchErr } = await client
      .from('finance_payments')
      .select('id, source, source_id, date, amount, payer_email, payer_name, status, client_id')
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

    // 3. Also delete live-source records with NO date that are duplicates
    //    (Zoho Payments records with null dates — match by amount to CSV records)
    const csvIndex = {};
    for (const rec of allPayments) {
      if (!csvSources.includes(rec.source)) continue;
      const amt = Math.abs(parseFloat(rec.amount) || 0).toFixed(2);
      if (!csvIndex[amt]) csvIndex[amt] = 0;
      csvIndex[amt]++;
    }
    for (const rec of allPayments) {
      if (!liveSources.includes(rec.source)) continue;
      if (rec.date) continue; // already handled above if before cutoff
      const amt = Math.abs(parseFloat(rec.amount) || 0).toFixed(2);
      if (csvIndex[amt]) {
        toDelete.add(rec.id);
      }
    }

    // 4. Deduplicate Brex records (same date + amount, keep matched version)
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

    // 5. Delete in batches
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

    // 6. Mark remaining unmatched records before cutoff as 'excluded'
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

    // 7. Restore 'matched' on records that have client_id but status='unmatched'
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

    return res.status(200).json({
      success: true,
      deleted: stats.deleted,
      excluded: stats.excluded,
      statusRestored: stats.statusRestored,
      errors: stats.errors
    });
  } catch (e) {
    return res.status(200).json({ success: false, error: e.message });
  }
};
