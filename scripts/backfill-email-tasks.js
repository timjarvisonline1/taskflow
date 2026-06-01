#!/usr/bin/env node

/**
 * Local script to backfill email task extraction.
 * Runs without Vercel's 300s timeout. Uses stored credentials from Supabase.
 *
 * Usage: node scripts/backfill-email-tasks.js
 */

const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');

const SUPABASE_URL = 'https://tnkmxmlgdhlgehlrbxuf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const USER_ID = '78bd1255-f05a-436b-abbd-f8c281d30210';
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

if (!SUPABASE_SERVICE_KEY) {
  console.error('Set SUPABASE_SERVICE_KEY env var first');
  process.exit(1);
}

const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const CATS = [
  'One-on-One', 'Internal Meeting', 'Workshop / Training', 'Deep Work',
  'Content Creation', 'Communication', 'Email', 'Admin / Ops', 'Finance',
  'Strategy / Planning', 'Sales / Outreach', 'Research', 'Review / QA',
  'Travel / Offsite'
];

function extractTextBody(payload) {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body && payload.body.data) {
    return Buffer.from(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
  }
  var parts = payload.parts || [];
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].mimeType === 'text/plain' && parts[i].body && parts[i].body.data)
      return Buffer.from(parts[i].body.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
    if (parts[i].parts) { var n = extractTextBody(parts[i]); if (n) return n; }
  }
  for (var j = 0; j < parts.length; j++) {
    if (parts[j].mimeType === 'text/html' && parts[j].body && parts[j].body.data)
      return Buffer.from(parts[j].body.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  return '';
}

async function refreshGmailToken(credRow) {
  var creds = credRow.credentials || {};
  var expiresAt = new Date(creds.token_expires_at || 0);
  if (expiresAt > new Date(Date.now() + 60000) && creds.access_token) return creds.access_token;

  var params = new URLSearchParams({
    refresh_token: creds.refresh_token,
    client_id: creds.client_id,
    client_secret: creds.client_secret,
    grant_type: 'refresh_token'
  });
  var resp = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: params });
  var data = await resp.json();
  if (data.error) throw new Error('Gmail refresh failed: ' + data.error);

  var newCreds = { ...creds, access_token: data.access_token, token_expires_at: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString() };
  await client.from('integration_credentials').update({ credentials: newCreds, updated_at: new Date().toISOString() }).eq('id', credRow.id);
  return data.access_token;
}

async function main() {
  console.log('Loading credentials...');

  var gmailCred = await client.from('integration_credentials').select('*').eq('user_id', USER_ID).eq('platform', 'gmail').eq('is_active', true).single();
  if (!gmailCred.data) { console.error('Gmail not connected'); process.exit(1); }
  var accessToken = await refreshGmailToken(gmailCred.data);

  var anthropicCred = await client.from('integration_credentials').select('*').eq('user_id', USER_ID).eq('platform', 'anthropic').eq('is_active', true).single();
  if (!anthropicCred.data || !anthropicCred.data.credentials.api_key) { console.error('Anthropic not configured'); process.exit(1); }
  var anthropic = new Anthropic({ apiKey: anthropicCred.data.credentials.api_key });
  var model = (anthropicCred.data.config && anthropicCred.data.config.model) || 'claude-sonnet-4-6';

  // Load CRM context
  var clientsRes = await client.from('clients').select('id, name, status').eq('user_id', USER_ID);
  var clientRecords = clientsRes.data || [];
  var campaignsRes = await client.from('campaigns').select('id, name, partner, end_client, status').eq('user_id', USER_ID);
  var campaignRecords = campaignsRes.data || [];
  var oppsRes = await client.from('opportunities').select('id, name, type, client, end_client, stage')
    .eq('user_id', USER_ID).not('stage', 'in', '("Closed Won","Closed Lost")');
  var oppRecords = oppsRes.data || [];
  var contactRes = await client.from('contacts').select('email, client_id').eq('user_id', USER_ID);
  var contactClientMap = {};
  (contactRes.data || []).forEach(c => { if (c.email && c.client_id) contactClientMap[c.email.toLowerCase()] = c.client_id; });
  var clientIdNameMap = {};
  clientRecords.forEach(c => { clientIdNameMap[c.id] = c.name; });
  var campaignNameMap = {};
  campaignRecords.forEach(c => { if (c.name) campaignNameMap[c.name.toLowerCase()] = c.id; });

  var clientContext = clientRecords.map(c => '- ' + c.name + (c.status ? ' [' + c.status + ']' : '')).join('\n') || '(no clients)';
  var campaignContext = campaignRecords.map(c => '- ' + c.name + (c.partner ? ' (' + c.partner + ')' : '') + (c.end_client ? ' / ' + c.end_client : '')).join('\n') || '(no campaigns)';
  var opportunityContext = oppRecords.map(o => '- ' + o.name + ' (' + (o.type || 'fc_partnership') + ')' + (o.client ? ' / ' + o.client : '') + ' [' + (o.stage || 'Lead') + ']').join('\n') || '(no open opportunities)';

  // Get user email
  var userData = await client.auth.admin.getUserById(USER_ID);
  var userEmail = (userData.data && userData.data.user && userData.data.user.email || '').toLowerCase();

  // Find unprocessed threads from last 14 days
  var fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();
  var threadsRes = await client.from('gmail_threads')
    .select('thread_id, subject, from_email, from_name, snippet, last_message_at, last_message_from, client_id')
    .eq('user_id', USER_ID)
    .gte('last_message_at', fourteenDaysAgo)
    .or('ai_tasks_generated.is.null,ai_tasks_generated.eq.false')
    .order('last_message_at', { ascending: false });

  var allThreads = threadsRes.data || [];
  console.log('Found ' + allThreads.length + ' unprocessed threads');

  // Pre-filter
  var threads = allThreads.filter(t => {
    var from = (t.from_email || '').toLowerCase();
    var subj = t.subject || '';
    if (userEmail && t.last_message_from && t.last_message_from.toLowerCase() === userEmail) return false;
    if (/noreply@|no-reply@|notifications@|mailer-daemon@|daemon@|@calendar\.google|@facebookmail|@e\.linkedin|@accounts\.google|@.*\.gserviceaccount/i.test(from)) return false;
    if (/^(re:\s*)?(accepted|declined|tentative|cancelled|updated):/i.test(subj)) return false;
    if (/delivery status notification|out of office|automatic reply|unsubscribe/i.test(subj)) return false;
    if (/your (receipt|invoice|payment|subscription|order)|pre-read for your upcoming|has joined your meeting|daily summary \| conversation|weekly (digest|usage|summary)|held tasks are still waiting|your audience .* is now ready|annual report due|made a transfer from|new sign-in|security alert|verification code|confirm your email|payment.*unsuccessful|limit reached|failed production deployment/i.test(subj)) return false;
    return true;
  });

  // Mark filtered-out threads
  var skippedIds = allThreads.filter(t => !threads.includes(t)).map(t => t.thread_id);
  if (skippedIds.length) {
    for (var i = 0; i < skippedIds.length; i += 50) {
      await client.from('gmail_threads').update({ ai_tasks_generated: true }).eq('user_id', USER_ID).in('thread_id', skippedIds.slice(i, i + 50));
    }
  }

  console.log('After pre-filter: ' + threads.length + ' actionable (' + skippedIds.length + ' skipped)');

  var totalTasks = 0;
  var processed = 0;

  for (var ti = 0; ti < threads.length; ti++) {
    var t = threads[ti];
    try {
      process.stdout.write('[' + (ti + 1) + '/' + threads.length + '] ' + (t.subject || '').substring(0, 60) + ' ... ');

      // Fetch body
      var fullResp = await fetch(GMAIL_API + '/threads/' + t.thread_id + '?format=full', {
        headers: { 'Authorization': 'Bearer ' + accessToken }
      });

      if (fullResp.status === 401) {
        gmailCred = await client.from('integration_credentials').select('*').eq('user_id', USER_ID).eq('platform', 'gmail').eq('is_active', true).single();
        if (gmailCred.data) accessToken = await refreshGmailToken(gmailCred.data);
        fullResp = await fetch(GMAIL_API + '/threads/' + t.thread_id + '?format=full', {
          headers: { 'Authorization': 'Bearer ' + accessToken }
        });
      }

      if (!fullResp.ok) { console.log('SKIP (HTTP ' + fullResp.status + ')'); continue; }

      var fullData = await fullResp.json();
      var bodyParts = (fullData.messages || []).map(msg => extractTextBody(msg.payload)).filter(b => b && b.trim().length > 10);
      var body = bodyParts.join('\n\n---\n\n');

      if (!body || body.trim().length < 20) {
        console.log('SKIP (no body)');
        await client.from('gmail_threads').update({ ai_tasks_generated: true }).eq('user_id', USER_ID).eq('thread_id', t.thread_id);
        continue;
      }

      // Auto-match client
      var clientName = '';
      var clientId = t.client_id || contactClientMap[(t.from_email || '').toLowerCase()] || null;
      if (clientId && clientIdNameMap[clientId]) clientName = clientIdNameMap[clientId];

      if (body.length > 50000) body = body.substring(0, 25000) + '\n\n[...truncated...]\n\n' + body.substring(body.length - 25000);

      var prompt = 'You are analyzing an email thread for Tim Jarvis, who runs Tim Jarvis Online LLC and Film&Content LLC.\n' +
        'Extract tasks Tim needs to action. If the email is a newsletter, marketing, notification, or not actionable, return empty tasks array.\n\n' +
        '═══ TASK RULES ═══\n' +
        '1. Only tasks Tim needs to DO: replies, follow-ups, documents, scheduling, etc.\n' +
        '2. Aggressive grouping: 1-3 tasks max. Multiple asks from same person = ONE task.\n' +
        '3. Match client/campaign names EXACTLY from lists below.\n' +
        '4. If not actionable, return {"tasks": []}\n\n' +
        '═══ EMAIL ═══\nSubject: ' + (t.subject || '') + '\nFrom: ' + (t.from_name || '') + ' <' + (t.from_email || '') + '>\n' +
        (clientName ? 'Client: ' + clientName + '\n' : '') + '\n' +
        '═══ BODY ═══\n' + body + '\n\n' +
        '═══ CLIENTS ═══\n' + clientContext + '\n\n' +
        '═══ CAMPAIGNS ═══\n' + campaignContext + '\n\n' +
        '═══ OPPORTUNITIES ═══\n' + opportunityContext + '\n\n' +
        '═══ CATEGORIES ═══\n' + CATS.join(', ') + '\n\n' +
        'Return ONLY valid JSON: {"tasks": [{"item": "...", "notes": "...", "importance": "Critical|Important|When Time Allows", "category": "...", "client": "...", "est": minutes, "campaign": "..."}]}';

      var response = await anthropic.messages.create({ model: model, max_tokens: 2048, messages: [{ role: 'user', content: prompt }] });
      var text = response.content[0].text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/g, '').trim();

      var parsed;
      try { parsed = JSON.parse(text); } catch (e) {
        console.log('PARSE ERROR');
        await client.from('gmail_threads').update({ ai_tasks_generated: true }).eq('user_id', USER_ID).eq('thread_id', t.thread_id);
        continue;
      }

      var tasks = Array.isArray(parsed) ? parsed : (parsed.tasks || []);
      var inserted = 0;

      for (var i = 0; i < tasks.length; i++) {
        var task = tasks[i];
        if (!task.item) continue;
        var campaignId = task.campaign ? (campaignNameMap[task.campaign.toLowerCase()] || '') : '';
        var res = await client.from('review').insert({
          user_id: USER_ID, item: task.item, notes: task.notes || '',
          importance: task.importance || 'Important', category: task.category || 'Email',
          client: task.client || clientName || '', end_client: '', type: 'Business',
          est: task.est || 15, due: null, source: 'Email', campaign: campaignId, thread_id: t.thread_id
        });
        if (!res.error) inserted++;
      }

      await client.from('gmail_threads').update({ ai_tasks_generated: true }).eq('user_id', USER_ID).eq('thread_id', t.thread_id);
      totalTasks += inserted;
      processed++;
      console.log(inserted ? inserted + ' task(s)' : 'no tasks');

      await sleep(300);
    } catch (err) {
      console.log('ERROR: ' + err.message);
      await client.from('gmail_threads').update({ ai_tasks_generated: true }).eq('user_id', USER_ID).eq('thread_id', t.thread_id);
    }
  }

  console.log('\nDone! Processed ' + processed + ' emails, generated ' + totalTasks + ' tasks.');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
