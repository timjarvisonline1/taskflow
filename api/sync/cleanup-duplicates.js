const { getServiceClient, verifyUserToken, cors } = require('../_lib/supabase');

/**
 * POST /api/sync/cleanup-duplicates
 * One-time cleanup: removes duplicate records created by live sync
 * that already exist from CSV imports, and restores matched status
 * on Brex records that got overwritten.
 */
module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const client = getServiceClient();
  const stats = { duplicatesRemoved: 0, statusRestored: 0, errors: [] };

  try {
    // 1. Get all finance payments for this user
    const { data: allPayments, error: fetchErr } = await client
      .from('finance_payments')
      .select('id, source, source_id, date, amount, payer_email, payer_name, status, client_id, category, campaign_id, end_client, notes')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (fetchErr) throw fetchErr;

    // Separate old (CSV) records from new (live sync) records
    const oldSources = ['stripe', 'stripe2', 'zoho', 'brex'];
    const newSources = ['zoho_books', 'zoho_payments', 'mercury'];

    const oldRecords = allPayments.filter(p => oldSources.includes(p.source));
    const newRecords = allPayments.filter(p => newSources.includes(p.source));

    // Also check for Brex records that were overwritten (same source, status changed to unmatched)
    // These would have client_id null/empty but were previously matched
    const brexOldMatched = oldRecords.filter(p => p.source === 'brex' && p.status === 'matched');
    const brexNewUnmatched = allPayments.filter(p => p.source === 'brex' && p.status === 'unmatched');

    // 2. Build lookup index from old records: key = date + amount (rounded to 2 dp)
    const oldIndex = {};
    for (const old of oldRecords) {
      if (!old.date) continue;
      const key = old.date + '|' + Math.abs(parseFloat(old.amount) || 0).toFixed(2);
      if (!oldIndex[key]) oldIndex[key] = [];
      oldIndex[key].push(old);
    }

    // 3. Find new records that duplicate old ones (same date + amount)
    const toDelete = [];
    for (const rec of newRecords) {
      if (!rec.date) continue;
      const key = rec.date + '|' + Math.abs(parseFloat(rec.amount) || 0).toFixed(2);
      const matches = oldIndex[key];
      if (matches && matches.length > 0) {
        toDelete.push(rec.id);
      }
    }

    // 4. Also check Brex duplicates (same source='brex', different source_id, same date+amount)
    const brexIndex = {};
    for (const rec of allPayments) {
      if (rec.source !== 'brex') continue;
      const key = rec.date + '|' + Math.abs(parseFloat(rec.amount) || 0).toFixed(2);
      if (!brexIndex[key]) brexIndex[key] = [];
      brexIndex[key].push(rec);
    }
    // For Brex duplicates, keep the one with matched status (or the first one), delete the rest
    for (const key of Object.keys(brexIndex)) {
      const group = brexIndex[key];
      if (group.length <= 1) continue;
      // Sort: matched first, then by whether it has client_id
      group.sort((a, b) => {
        if (a.status === 'matched' && b.status !== 'matched') return -1;
        if (b.status === 'matched' && a.status !== 'matched') return 1;
        if (a.client_id && !b.client_id) return -1;
        if (b.client_id && !a.client_id) return 1;
        return 0;
      });
      // Keep first (best), delete rest
      for (let i = 1; i < group.length; i++) {
        if (!toDelete.includes(group[i].id)) {
          toDelete.push(group[i].id);
        }
      }
    }

    // 5. Delete duplicates in batches
    if (toDelete.length > 0) {
      // Delete in batches of 50
      for (let i = 0; i < toDelete.length; i += 50) {
        const batch = toDelete.slice(i, i + 50);
        const { error: delErr } = await client
          .from('finance_payments')
          .delete()
          .in('id', batch);
        if (delErr) stats.errors.push('Delete batch error: ' + delErr.message);
        else stats.duplicatesRemoved += batch.length;
      }
    }

    // 6. Restore matched status on records that were overwritten
    // Find records with client_id set but status='unmatched' (shouldn't happen)
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
      duplicatesRemoved: stats.duplicatesRemoved,
      statusRestored: stats.statusRestored,
      errors: stats.errors
    });
  } catch (e) {
    return res.status(200).json({ success: false, error: e.message });
  }
};
