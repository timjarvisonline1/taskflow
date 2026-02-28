#!/usr/bin/env node
/**
 * TaskFlow Finance — One-time CSV Import Script
 *
 * Reads CSV exports from Stripe (2 accounts), Zoho Payments, and Brex,
 * normalises them, and inserts into the finance_payments table in Supabase.
 *
 * Usage:
 *   1. npm install @supabase/supabase-js csv-parse
 *   2. Set SUPABASE_URL, SUPABASE_KEY, and USER_ID below (or via env)
 *   3. node scripts/import-finance.js
 *
 * The script is idempotent — it checks source + source_id to skip duplicates.
 */

var { createClient } = require('@supabase/supabase-js');
var fs = require('fs');
var path = require('path');
var { parse } = require('csv-parse/sync');

// ── Config ──────────────────────────────────────────────────────────
var SUPABASE_URL = process.env.SUPABASE_URL || 'https://tnkmxmlgdhlgehlrbxuf.supabase.co';
var SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';  // USE SERVICE ROLE KEY (not anon) to bypass RLS
var USER_ID      = process.env.USER_ID || '';               // Your auth.users UUID

if (!SUPABASE_KEY) { console.error('Set SUPABASE_SERVICE_KEY env var'); process.exit(1); }
if (!USER_ID)      { console.error('Set USER_ID env var'); process.exit(1); }

var sb = createClient(SUPABASE_URL, SUPABASE_KEY);

var CSV_DIR = path.join(__dirname, '..', '..', 'TaskFlow Data', 'Finance');

// ── Brex: names to EXCLUDE (internal transfers, expenses, pass-through) ──
var BREX_EXCLUDE = [
  'Client Advertising Account',
  'Cash Reserve',
  'Brex Card',
  'STRIPE',
  'TIM JARVIS ONLIN',
  'Film&Content LLC',
  'Lee Brack',
  'Reservoir Limited',
  'Dreyfus Government',
  'Brex',
  'PAYPAL',
  'IMPACT RADIUS',
  'Treasury',
  'Stripe - Do Not Use',
  'Nightwolf Productions',  // ACH return, not a real payment
  'CITYCOAST TRUST'
];

function brexIsExcluded(toFrom) {
  var tf = toFrom.toLowerCase();
  for (var i = 0; i < BREX_EXCLUDE.length; i++) {
    if (tf.indexOf(BREX_EXCLUDE[i].toLowerCase()) !== -1) return true;
  }
  return false;
}

// ── Parse helpers ───────────────────────────────────────────────────
function parseDate(str) {
  if (!str) return null;
  str = str.trim();

  // MM/DD/YYYY (Brex)
  var m1 = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m1) return m1[3] + '-' + m1[1] + '-' + m1[2];

  // YYYY-MM-DD (already ISO)
  var m2 = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m2) return m2[1] + '-' + m2[2] + '-' + m2[3];

  // MM-DD-YYYY (Mercury)
  var m3 = str.match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (m3) return m3[3] + '-' + m3[1] + '-' + m3[2];

  // "Jan 28, 2026, 04:04 PM" (Zoho)
  var d = new Date(str);
  if (!isNaN(d.getTime())) {
    var y = d.getFullYear();
    var mo = String(d.getMonth() + 1).padStart(2, '0');
    var da = String(d.getDate()).padStart(2, '0');
    return y + '-' + mo + '-' + da;
  }
  return null;
}

function num(v) {
  if (!v) return 0;
  return parseFloat(String(v).replace(/[,$]/g, '')) || 0;
}

// ── Read & parse CSV ────────────────────────────────────────────────
function readCSV(filename) {
  var fp = path.join(CSV_DIR, filename);
  if (!fs.existsSync(fp)) { console.error('File not found:', fp); return []; }
  var raw = fs.readFileSync(fp, 'utf-8');
  return parse(raw, { columns: true, skip_empty_lines: true, relax_column_count: true });
}

// ── Transform functions per source ──────────────────────────────────

function transformStripe1(rows) {
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if ((r['Status'] || '').trim() !== 'Paid') continue;
    var amt = num(r['Amount']);
    if (amt <= 0) continue;
    out.push({
      user_id:     USER_ID,
      date:        parseDate(r['Created date (UTC)']),
      amount:      amt,
      fee:         num(r['Fee']),
      net:         amt - num(r['Fee']),
      source:      'stripe',
      source_id:   (r['id'] || '').trim(),
      payer_email: (r['Customer Email'] || '').trim().toLowerCase(),
      payer_name:  (r['Customer Description'] || r['name (metadata)'] || '').trim(),
      description: (r['Description'] || '').trim(),
      category:    '',
      client_id:   null,
      campaign_id: null,
      end_client:  '',
      notes:       '',
      status:      'unmatched'
    });
  }
  return out;
}

function transformStripe2(rows) {
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if ((r['Status'] || '').trim() !== 'Paid') continue;
    var amt = num(r['Amount']);
    if (amt <= 0) continue;
    out.push({
      user_id:     USER_ID,
      date:        parseDate(r['Created date (UTC)']),
      amount:      amt,
      fee:         num(r['Fee']),
      net:         amt - num(r['Fee']),
      source:      'stripe2',
      source_id:   (r['id'] || '').trim(),
      payer_email: (r['Customer Email'] || '').trim().toLowerCase(),
      payer_name:  (r['Customer Description'] || r['name (metadata)'] || '').trim(),
      description: (r['Description'] || '').trim(),
      category:    '',
      client_id:   null,
      campaign_id: null,
      end_client:  '',
      notes:       '',
      status:      'unmatched'
    });
  }
  return out;
}

function transformZoho(rows) {
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if ((r['Status'] || '').trim() !== 'succeeded') continue;
    var amt = num(r['Amount']);
    if (amt <= 0) continue;
    out.push({
      user_id:     USER_ID,
      date:        parseDate(r['Date']),
      amount:      amt,
      fee:         num(r['FeeAmount']),
      net:         amt - num(r['FeeAmount']),
      source:      'zoho',
      source_id:   (r['PaymentID'] || '').trim(),
      payer_email: (r['ReceiptEmail'] || '').trim().toLowerCase(),
      payer_name:  (r['CardHolderName'] || '').trim(),
      description: (r['Description'] || '').trim(),
      category:    '',
      client_id:   null,
      campaign_id: null,
      end_client:  '',
      notes:       '',
      status:      'unmatched'
    });
  }
  return out;
}

function transformBrex(rows) {
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if ((r['Status'] || '').trim() !== 'Complete') continue;
    var amt = num(r['Amount']);
    if (amt <= 0) continue;  // only incoming (positive)
    var toFrom = (r['To/From'] || '').trim();
    if (brexIsExcluded(toFrom)) continue;
    var method = (r['Method'] || '').trim();
    if (method !== 'ACH' && method !== 'Wire' && method !== 'ACH return') continue;
    out.push({
      user_id:     USER_ID,
      date:        parseDate(r['Date']),
      amount:      amt,
      fee:         0,
      net:         amt,
      source:      'brex',
      source_id:   '',
      payer_email: '',
      payer_name:  toFrom,
      description: (r['Memo'] || r['External Memo'] || '').trim(),
      category:    '',
      client_id:   null,
      campaign_id: null,
      end_client:  '',
      notes:       'Method: ' + method,
      status:      'unmatched'
    });
  }
  return out;
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log('TaskFlow Finance Import');
  console.log('=======================\n');

  // 1. Read & transform
  console.log('Reading CSVs from:', CSV_DIR);

  var stripe1Rows = readCSV('stripe_payments.csv');
  var stripe2Rows = readCSV('stripe_account2_payments.csv');
  var zohoRows    = readCSV('zoho_payments.csv');
  var brexRows    = readCSV('brex_payments.csv');

  var stripe1 = transformStripe1(stripe1Rows);
  var stripe2 = transformStripe2(stripe2Rows);
  var zoho    = transformZoho(zohoRows);
  var brex    = transformBrex(brexRows);

  console.log('Stripe Account 1:', stripe1.length, 'records');
  console.log('Stripe Account 2:', stripe2.length, 'records');
  console.log('Zoho Payments:   ', zoho.length, 'records');
  console.log('Brex Direct:     ', brex.length, 'records');

  var all = stripe1.concat(stripe2).concat(zoho).concat(brex);
  console.log('Total to import: ', all.length, 'records\n');

  if (all.length === 0) {
    console.log('Nothing to import.');
    return;
  }

  // 2. Check for existing records to avoid duplicates
  console.log('Checking for existing records...');
  var { data: existing, error: existErr } = await sb
    .from('finance_payments')
    .select('source, source_id')
    .eq('user_id', USER_ID);

  if (existErr) {
    console.error('Error checking existing:', existErr.message);
    return;
  }

  var existingSet = new Set();
  (existing || []).forEach(function(r) {
    if (r.source_id) existingSet.add(r.source + ':' + r.source_id);
  });
  console.log('Existing records:', existingSet.size);

  // Filter out duplicates (only for records with source_id)
  var toInsert = all.filter(function(r) {
    if (!r.source_id) return true;  // Brex has no source_id, always insert
    return !existingSet.has(r.source + ':' + r.source_id);
  });

  console.log('After dedup:     ', toInsert.length, 'new records\n');

  if (toInsert.length === 0) {
    console.log('All records already imported. Nothing to do.');
    return;
  }

  // 3. Insert in batches of 50
  var BATCH = 50;
  var inserted = 0;
  var errors = 0;

  for (var i = 0; i < toInsert.length; i += BATCH) {
    var batch = toInsert.slice(i, i + BATCH);
    var { error: insErr } = await sb.from('finance_payments').insert(batch);
    if (insErr) {
      console.error('Insert error (batch', Math.floor(i / BATCH) + 1, '):', insErr.message);
      errors += batch.length;
    } else {
      inserted += batch.length;
      process.stdout.write('Inserted: ' + inserted + '/' + toInsert.length + '\r');
    }
  }

  console.log('\n\nImport complete!');
  console.log('  Inserted:', inserted);
  console.log('  Errors:  ', errors);

  // 4. Summary by source
  console.log('\n--- Revenue Summary ---');
  var sources = { stripe: 0, stripe2: 0, zoho: 0, brex: 0 };
  toInsert.forEach(function(r) { sources[r.source] += r.amount; });
  Object.keys(sources).forEach(function(s) {
    console.log('  ' + s + ': $' + sources[s].toFixed(2));
  });
  console.log('  Total: $' + Object.values(sources).reduce(function(a, b) { return a + b; }, 0).toFixed(2));
}

main().catch(function(err) {
  console.error('Fatal error:', err);
  process.exit(1);
});
