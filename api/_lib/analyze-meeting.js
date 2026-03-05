const Anthropic = require('@anthropic-ai/sdk');
const { getCredentials } = require('./supabase');

const CATS = [
  'One-on-One', 'Internal Meeting', 'Workshop / Training', 'Deep Work',
  'Content Creation', 'Communication', 'Email', 'Admin / Ops', 'Finance',
  'Strategy / Planning', 'Sales / Outreach', 'Research', 'Review / QA',
  'Travel / Offsite'
];

async function analyzeMeetingForTasks(userId, meetingRow, supabase) {
  // Load Anthropic credentials — skip silently if not configured
  var credRow = await getCredentials(userId, 'anthropic');
  if (!credRow || !credRow.credentials || !credRow.credentials.api_key) return 0;

  var model = (credRow.config && credRow.config.model) || 'claude-sonnet-4-6';
  var anthropic = new Anthropic({ apiKey: credRow.credentials.api_key });

  // Load CRM context
  var clientsRes = await supabase.from('clients').select('id, name, status').eq('user_id', userId);
  var clientRecords = clientsRes.data || [];
  var campaignsRes = await supabase.from('campaigns').select('id, name, partner, end_client, status').eq('user_id', userId);
  var campaignRecords = campaignsRes.data || [];

  // Resolve matched client name
  var clientName = '';
  if (meetingRow.client_id) {
    var matched = clientRecords.find(function(c) { return c.id === meetingRow.client_id; });
    if (matched) clientName = matched.name;
  }

  // Build client context
  var clientContext = clientRecords.length
    ? clientRecords.map(function(c) { return '- ' + c.name + (c.status ? ' [' + c.status + ']' : ''); }).join('\n')
    : '(no clients)';

  // Build campaign context
  var campaignContext = campaignRecords.length
    ? campaignRecords.map(function(c) {
        return '- ' + c.name + (c.partner ? ' (' + c.partner + ')' : '') +
          (c.end_client ? ' / ' + c.end_client : '') +
          (c.status ? ' [' + c.status + ']' : '');
      }).join('\n')
    : '(no campaigns)';

  // Format participants
  var participantList = (meetingRow.participants || [])
    .map(function(p) { return (p.name || '') + (p.email ? ' <' + p.email + '>' : ''); })
    .filter(Boolean)
    .join('\n');

  // Format action items from Read.ai
  var actionItemList = (meetingRow.action_items || [])
    .map(function(a, i) { return (i + 1) + '. ' + (a.text || ''); })
    .join('\n') || '(none)';

  // Truncate transcript if too long (keep first and last portions)
  var transcript = meetingRow.transcript || '';
  if (transcript.length > 100000) {
    var firstPart = transcript.substring(0, 50000);
    var lastPart = transcript.substring(transcript.length - 50000);
    transcript = firstPart + '\n\n[... transcript truncated for length ...]\n\n' + lastPart;
  }

  // Format meeting date
  var meetingDate = '';
  if (meetingRow.start_time) {
    var d = new Date(meetingRow.start_time);
    if (!isNaN(d.getTime())) {
      meetingDate = d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
  }

  var prompt = 'You are analyzing a meeting transcript for ' + meetingRow.owner_name +
    ' (' + meetingRow.owner_email + ').\n' +
    'Your job is to identify tasks that ' + meetingRow.owner_name +
    ' needs to do based on this meeting.\n\n' +

    'RULES:\n' +
    '1. Only create tasks for commitments ' + meetingRow.owner_name +
    ' made, actions assigned to them, or things they clearly need to follow up on.\n' +
    '2. Group related items into a SINGLE task when they involve the same recipient or context:\n' +
    '   - Multiple things to send to one person → one "Follow-up with [Name]" task, list specifics in notes\n' +
    '   - Multiple prep items for the same deliverable → one task with subtasks in notes\n' +
    '3. Create SEPARATE tasks for genuinely different types of work:\n' +
    '   - "Set up a campaign" and "Install video tracking" are separate tasks\n' +
    '   - "Review budget" and "Draft proposal" are separate tasks\n' +
    '4. Include specific details, deadlines, and context in the notes field. Notes should read like a brief for someone picking up the task.\n' +
    '5. Match to a client name from the provided list if applicable (exact name match).\n' +
    '6. Match to a campaign name if the meeting topic relates to one (exact name match).\n' +
    '7. If no tasks apply to ' + meetingRow.owner_name + ', return an empty array [].\n' +
    '8. Do NOT create tasks for things other participants committed to.\n\n' +

    '═══ MEETING ═══\n' +
    'Title: ' + (meetingRow.title || 'Untitled') + '\n' +
    'Date: ' + (meetingDate || 'Unknown') + '\n' +
    'Client: ' + (clientName || 'Not matched') + '\n\n' +

    '═══ PARTICIPANTS ═══\n' +
    (participantList || '(none listed)') + '\n\n' +

    '═══ SUMMARY (from Read.ai) ═══\n' +
    (meetingRow.summary || '(no summary)') + '\n\n' +

    '═══ ACTION ITEMS (from Read.ai) ═══\n' +
    actionItemList + '\n\n' +

    '═══ TRANSCRIPT ═══\n' +
    (transcript || '(no transcript)') + '\n\n' +

    '═══ AVAILABLE CLIENTS ═══\n' +
    clientContext + '\n\n' +

    '═══ AVAILABLE CAMPAIGNS ═══\n' +
    campaignContext + '\n\n' +

    '═══ TASK CATEGORIES ═══\n' +
    CATS.join(', ') + '\n\n' +

    'Return ONLY a valid JSON array. Each object must have:\n' +
    '- item (string): concise task name starting with an imperative verb (e.g., "Follow-up with John on deliverables", "Set up tracking for Campaign X")\n' +
    '- notes (string): detailed context including specific items, deadlines mentioned, relevant discussion points from the transcript\n' +
    '- importance (string): "Critical", "Important", or "When Time Allows"\n' +
    '- category (string): best match from the categories list above\n' +
    '- client (string): exact client name from the list above, or empty string if not applicable\n' +
    '- est (integer): estimated minutes (15, 30, 60, etc.)\n' +
    '- campaign (string): exact campaign name from the list above, or empty string if not applicable\n\n' +
    'If there are no tasks for ' + meetingRow.owner_name + ', return: []';

  // Call Claude API
  var response = await anthropic.messages.create({
    model: model,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }]
  });

  // Parse response
  var text = response.content[0].text.trim();
  var cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/g, '').trim();
  var tasks;
  try {
    tasks = JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse meeting AI response:', text.substring(0, 500));
    return 0;
  }

  if (!Array.isArray(tasks) || tasks.length === 0) {
    // No tasks — still mark as processed
    await supabase.from('meetings').update({ ai_tasks_generated: true }).eq('id', meetingRow.id);
    return 0;
  }

  // Build campaign name → ID map (case-insensitive)
  var campaignNameMap = {};
  campaignRecords.forEach(function(c) {
    if (c.name) campaignNameMap[c.name.toLowerCase()] = c.id;
  });

  // Insert review items
  var inserted = 0;
  for (var i = 0; i < tasks.length; i++) {
    var t = tasks[i];
    if (!t.item) continue;

    // Resolve campaign name to ID
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
      category: t.category || '',
      client: t.client || clientName || '',
      end_client: '',
      type: 'Business',
      est: t.est || 30,
      due: null,
      source: 'Read.ai',
      campaign: campaignId
    };

    var res = await supabase.from('review').insert(reviewRow);
    if (!res.error) inserted++;
  }

  // Mark meeting as processed
  await supabase.from('meetings').update({ ai_tasks_generated: true }).eq('id', meetingRow.id);

  return inserted;
}

module.exports = { analyzeMeetingForTasks };
