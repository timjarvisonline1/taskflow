const Anthropic = require('@anthropic-ai/sdk');
const { getCredentials } = require('./supabase');

const CATS = [
  'One-on-One', 'Internal Meeting', 'Workshop / Training', 'Deep Work',
  'Content Creation', 'Communication', 'Email', 'Admin / Ops', 'Finance',
  'Strategy / Planning', 'Sales / Outreach', 'Research', 'Review / QA',
  'Travel / Offsite'
];

var SKIP_PATTERNS = [
  /noreply@/i, /no-reply@/i, /notifications@/i, /mailer-daemon@/i,
  /newsletter@/i, /digest@/i, /updates@/i, /billing@/i, /receipts@/i,
  /support@.*\.zendesk/i, /calendar-notification@/i, /@calendar\.google\.com/i
];

function isAutomatedEmail(fromEmail, subject) {
  for (var i = 0; i < SKIP_PATTERNS.length; i++) {
    if (SKIP_PATTERNS[i].test(fromEmail)) return true;
  }
  if (/^(re:\s*)?unsubscribe|your\s+(receipt|invoice|order|payment|subscription)/i.test(subject)) return true;
  return false;
}

/**
 * Analyze a batch of email threads and extract tasks into the review queue.
 * Modelled on analyzeMeetingForTasks() in analyze-meeting.js.
 *
 * @param {string} userId
 * @param {Array} threads - Array of {thread_id, subject, from_email, from_name, snippet, body, last_message_from, participants}
 * @param {object} supabase - Supabase service client
 * @param {function} [log] - Optional progress logger
 * @returns {number} Number of review items inserted
 */
async function analyzeEmailsForTasks(userId, threads, supabase, log) {
  if (!log) log = function() {};

  var credRow = await getCredentials(userId, 'anthropic');
  if (!credRow || !credRow.credentials || !credRow.credentials.api_key) {
    log('No Anthropic API key configured, skipping email analysis');
    return 0;
  }

  var model = (credRow.config && credRow.config.model) || 'claude-sonnet-4-6';
  var anthropic = new Anthropic({ apiKey: credRow.credentials.api_key });

  // Load CRM context (same as analyze-meeting.js)
  var clientsRes = await supabase.from('clients').select('id, name, status').eq('user_id', userId);
  var clientRecords = clientsRes.data || [];
  var campaignsRes = await supabase.from('campaigns').select('id, name, partner, end_client, status').eq('user_id', userId);
  var campaignRecords = campaignsRes.data || [];
  var oppsRes = await supabase.from('opportunities').select('id, name, type, client, end_client, stage, contact_name, contact_email')
    .eq('user_id', userId).not('stage', 'in', '("Closed Won","Closed Lost")');
  var oppRecords = oppsRes.data || [];

  var clientContext = clientRecords.length
    ? clientRecords.map(function(c) { return '- ' + c.name + (c.status ? ' [' + c.status + ']' : ''); }).join('\n')
    : '(no clients)';
  var campaignContext = campaignRecords.length
    ? campaignRecords.map(function(c) {
        return '- ' + c.name + (c.partner ? ' (' + c.partner + ')' : '') +
          (c.end_client ? ' / ' + c.end_client : '') +
          (c.status ? ' [' + c.status + ']' : '');
      }).join('\n')
    : '(no campaigns)';
  var opportunityContext = oppRecords.length
    ? oppRecords.map(function(o) {
        return '- ' + o.name + ' (' + (o.type || 'fc_partnership') + ')' +
          (o.client ? ' / ' + o.client : '') +
          (o.end_client ? ' / ' + o.end_client : '') +
          ' [' + (o.stage || 'Lead') + ']';
      }).join('\n')
    : '(no open opportunities)';

  var campaignNameMap = {};
  campaignRecords.forEach(function(c) { if (c.name) campaignNameMap[c.name.toLowerCase()] = c.id; });

  // Get user's email to detect "Tim already replied"
  var userEmail = '';
  try {
    var userData = await supabase.auth.admin.getUserById(userId);
    if (userData.data && userData.data.user && userData.data.user.email) {
      userEmail = userData.data.user.email.toLowerCase();
    }
  } catch (e) { /* ignore */ }

  // Build client email map for auto-matching
  var clientEmailMap = {};
  clientRecords.forEach(function(c) { /* client records don't always have email */ });
  var contactRes = await supabase.from('contacts').select('email, client_id').eq('user_id', userId);
  var contactClientMap = {};
  (contactRes.data || []).forEach(function(c) {
    if (c.email && c.client_id) contactClientMap[c.email.toLowerCase()] = c.client_id;
  });
  var clientIdNameMap = {};
  clientRecords.forEach(function(c) { clientIdNameMap[c.id] = c.name; });

  var totalInserted = 0;

  for (var ti = 0; ti < threads.length; ti++) {
    var thread = threads[ti];
    try {
      // Skip automated/newsletter emails
      if (isAutomatedEmail(thread.from_email || '', thread.subject || '')) {
        log('Skipping automated: ' + (thread.subject || '').substring(0, 50));
        await supabase.from('gmail_threads').update({ ai_tasks_generated: true }).eq('user_id', userId).eq('thread_id', thread.thread_id);
        continue;
      }

      // Skip threads where Tim is the last sender (already responded)
      if (userEmail && thread.last_message_from && thread.last_message_from.toLowerCase() === userEmail) {
        log('Skipping (Tim replied): ' + (thread.subject || '').substring(0, 50));
        await supabase.from('gmail_threads').update({ ai_tasks_generated: true }).eq('user_id', userId).eq('thread_id', thread.thread_id);
        continue;
      }

      // Auto-match client from sender email
      var clientName = '';
      var clientId = thread.client_id || null;
      if (!clientId && thread.from_email) {
        clientId = contactClientMap[thread.from_email.toLowerCase()] || null;
      }
      if (clientId && clientIdNameMap[clientId]) {
        clientName = clientIdNameMap[clientId];
      }

      // Truncate body if too long
      var body = thread.body || thread.snippet || '';
      if (body.length > 50000) {
        body = body.substring(0, 25000) + '\n\n[... email truncated ...]\n\n' + body.substring(body.length - 25000);
      }

      var prompt = 'You are analyzing email threads for Tim Jarvis, who runs two businesses: Tim Jarvis Online LLC and Film&Content LLC.\n' +
        'Your job is to identify tasks Tim needs to do based on these emails.\n\n' +

        '═══ TASK RULES ═══\n' +
        'Think in terms of WORK SESSIONS — what does Tim need to sit down and DO?\n\n' +
        '1. Only create tasks for things Tim needs to action: replies needed, follow-ups, documents to prepare, calls to schedule, etc.\n' +
        '2. AGGRESSIVE GROUPING:\n' +
        '   - Multiple asks from the same person/thread = ONE task\n' +
        '   - "Reply to confirm, send the file, schedule call" = ONE task ("Follow up with [Name]")\n' +
        '   - Related admin from the same topic = ONE task\n' +
        '3. TARGET: 1-3 tasks per email batch. If you have more, you are NOT grouping enough.\n' +
        '4. Notes should list the specific actions needed, deadlines mentioned, and key context.\n' +
        '5. Match client and campaign names EXACTLY from the provided lists.\n' +
        '6. If no tasks apply (informational only, newsletter, automated), return an empty tasks array.\n' +
        '7. Do NOT create tasks for things the sender said THEY would do.\n\n' +

        '═══ EMAIL THREAD ═══\n' +
        'Subject: ' + (thread.subject || '(no subject)') + '\n' +
        'From: ' + (thread.from_name || '') + ' <' + (thread.from_email || '') + '>\n' +
        'Date: ' + (thread.last_message_at || '') + '\n' +
        (clientName ? 'Matched Client: ' + clientName + '\n' : '') + '\n' +

        '═══ EMAIL BODY ═══\n' +
        body + '\n\n' +

        '═══ AVAILABLE CLIENTS ═══\n' + clientContext + '\n\n' +
        '═══ AVAILABLE CAMPAIGNS ═══\n' + campaignContext + '\n\n' +
        '═══ AVAILABLE OPPORTUNITIES (open) ═══\n' + opportunityContext + '\n\n' +
        '═══ TASK CATEGORIES ═══\n' + CATS.join(', ') + '\n\n' +

        'Return ONLY a valid JSON object:\n' +
        '{\n' +
        '  "tasks": [\n' +
        '    {\n' +
        '      "item": "concise task name (imperative verb)",\n' +
        '      "notes": "specific actions needed, deadlines, context from the email",\n' +
        '      "importance": "Critical" | "Important" | "When Time Allows",\n' +
        '      "category": "from categories list",\n' +
        '      "client": "exact client name or empty string",\n' +
        '      "est": estimated_minutes,\n' +
        '      "campaign": "exact campaign name or empty string"\n' +
        '    }\n' +
        '  ]\n' +
        '}';

      var response = await anthropic.messages.create({
        model: model,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }]
      });

      var text = response.content[0].text.trim();
      var cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/g, '').trim();
      var parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch (e) {
        console.error('Failed to parse email AI response:', text.substring(0, 300));
        await supabase.from('gmail_threads').update({ ai_tasks_generated: true }).eq('user_id', userId).eq('thread_id', thread.thread_id);
        continue;
      }

      var tasks = Array.isArray(parsed) ? parsed : (parsed.tasks || []);

      var inserted = 0;
      for (var i = 0; i < tasks.length; i++) {
        var t = tasks[i];
        if (!t.item) continue;

        var campaignId = '';
        if (t.campaign) {
          var cid = campaignNameMap[t.campaign.toLowerCase()];
          if (cid) campaignId = cid;
        }

        var reviewRow = {
          user_id: userId,
          item: t.item,
          notes: t.notes || '',
          importance: t.importance || 'Important',
          category: t.category || 'Email',
          client: t.client || clientName || '',
          end_client: '',
          type: 'Business',
          est: t.est || 15,
          due: null,
          source: 'Email',
          campaign: campaignId,
          thread_id: thread.thread_id
        };

        var res = await supabase.from('review').insert(reviewRow);
        if (!res.error) inserted++;
      }

      await supabase.from('gmail_threads').update({ ai_tasks_generated: true }).eq('user_id', userId).eq('thread_id', thread.thread_id);

      totalInserted += inserted;
      if (inserted > 0) {
        log('Email: "' + (thread.subject || '').substring(0, 50) + '" → ' + inserted + ' task(s)');
      }
    } catch (threadErr) {
      console.error('Email analysis error for ' + thread.thread_id + ':', threadErr.message);
      await supabase.from('gmail_threads').update({ ai_tasks_generated: true }).eq('user_id', userId).eq('thread_id', thread.thread_id);
    }
  }

  return totalInserted;
}

module.exports = { analyzeEmailsForTasks };
