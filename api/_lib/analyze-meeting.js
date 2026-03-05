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
  var oppsRes = await supabase.from('opportunities').select('id, name, type, client, end_client, stage, contact_name, contact_email')
    .eq('user_id', userId).not('stage', 'in', '("Closed Won","Closed Lost")');
  var oppRecords = oppsRes.data || [];

  // Resolve matched client name
  var clientName = '';
  if (meetingRow.client_id) {
    var matched = clientRecords.find(function(c) { return c.id === meetingRow.client_id; });
    if (matched) clientName = matched.name;
  }

  // Resolve current campaign/opportunity names
  var currentCampaignName = '';
  if (meetingRow.campaign_id) {
    var mc = campaignRecords.find(function(c) { return c.id === meetingRow.campaign_id; });
    if (mc) currentCampaignName = mc.name;
  }
  var currentOppName = '';
  if (meetingRow.opportunity_id) {
    var mo = oppRecords.find(function(o) { return o.id === meetingRow.opportunity_id; });
    if (mo) currentOppName = mo.name;
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

  // Build opportunity context
  var opportunityContext = oppRecords.length
    ? oppRecords.map(function(o) {
        return '- ' + o.name + ' (' + (o.type || 'fc_partnership') + ')' +
          (o.client ? ' / ' + o.client : '') +
          (o.end_client ? ' / ' + o.end_client : '') +
          ' [' + (o.stage || 'Lead') + ']';
      }).join('\n')
    : '(no open opportunities)';

  // Format participants
  var participantList = (meetingRow.participants || [])
    .map(function(p) { return (p.name || '') + (p.email ? ' <' + p.email + '>' : ''); })
    .filter(Boolean)
    .join('\n');

  // Format action items from Read.ai
  var actionItemList = (meetingRow.action_items || [])
    .map(function(a, i) { return (i + 1) + '. ' + (a.text || ''); })
    .join('\n') || '(none)';

  // Truncate transcript if too long
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
    ' (' + meetingRow.owner_email + '), who runs two businesses: Tim Jarvis Online LLC and Film&Content LLC.\n' +
    'Your job is to: (1) identify tasks ' + meetingRow.owner_name +
    ' needs to do, and (2) suggest CRM actions.\n\n' +

    '═══ TASK RULES ═══\n' +
    'Think in terms of WORK SESSIONS — what are the 2-4 things ' + meetingRow.owner_name +
    ' would actually sit down and DO after this meeting?\n\n' +
    '1. Only create tasks for commitments ' + meetingRow.owner_name +
    ' made, actions assigned to them, or things they clearly need to follow up on.\n' +
    '2. AGGRESSIVE GROUPING:\n' +
    '   - "Send proposal, send deck, share link" to one person = ONE task ("Follow up with [Name]"), list items in notes\n' +
    '   - "Review analytics, pull report, check KPIs" = ONE task ("Review analytics and reporting")\n' +
    '   - "Update CRM, file notes, schedule follow-up" = ONE task ("Post-meeting admin")\n' +
    '   - Multiple follow-ups to the same person = ONE task\n' +
    '   - Related items for the same deliverable = ONE task\n' +
    '3. Only create SEPARATE tasks for genuinely DIFFERENT work streams (different sittings):\n' +
    '   - "Set up a new campaign" and "Draft proposal for different client" = separate\n' +
    '   - "Review budget" and "Build creative brief" = separate\n' +
    '4. TARGET: 1-4 tasks per meeting. If you have more than 4, you are NOT grouping aggressively enough. Re-examine and combine.\n' +
    '5. Notes should list the individual sub-items that were grouped, plus deadlines and context.\n' +
    '6. Match client and campaign names EXACTLY from the provided lists.\n' +
    '7. Do NOT create tasks for things other participants committed to.\n' +
    '8. If no tasks apply, return an empty tasks array.\n\n' +

    '═══ CRM SUGGESTION RULES ═══\n' +
    'Analyze the meeting for CRM intelligence. Only suggest when you have reasonable confidence.\n\n' +
    '1. LINK CAMPAIGN: If discussion clearly relates to an existing campaign (by name, client, or end-client), suggest linking.\n' +
    '   - Only suggest if the meeting does NOT already have a campaign set.\n' +
    '   - Type: "link_campaign" with campaign_name and reason.\n' +
    '2. LINK OPPORTUNITY: If discussion relates to an existing opportunity (sales, proposal, negotiation), suggest linking.\n' +
    '   - Only suggest if the meeting does NOT already have an opportunity set.\n' +
    '   - Type: "link_opportunity" with opportunity_name and reason.\n' +
    '3. CREATE OPPORTUNITY: If this is a new business discussion (prospecting, pitch, partnership exploration) with NO matching opportunity, suggest creating one.\n' +
    '   - Type: "create_opportunity" with suggested_name, suggested_type, client, end_client, contact_name, contact_email, reason.\n' +
    '   - Types: "retain_live" (retainer/consulting), "fc_partnership" (Film&Content partnership), "fc_direct" (direct F&C client).\n' +
    '4. SUGGEST CLIENT: If a different or better client match exists, or no client is matched but should be.\n' +
    '   - Type: "suggest_client" with client_name and reason.\n' +
    '5. SUGGEST END CLIENT: If an end-client name is discussed but not currently set on the meeting.\n' +
    '   - Type: "suggest_end_client" with end_client and reason.\n\n' +
    'If the meeting is purely internal or has no CRM relevance, return an empty suggestions array.\n\n' +

    '═══ MEETING ═══\n' +
    'Title: ' + (meetingRow.title || 'Untitled') + '\n' +
    'Date: ' + (meetingDate || 'Unknown') + '\n\n' +

    '═══ CURRENT CRM STATE ═══\n' +
    'Client: ' + (clientName || 'Not set') + '\n' +
    'End Client: ' + (meetingRow.end_client || 'Not set') + '\n' +
    'Campaign: ' + (currentCampaignName || 'Not set') + '\n' +
    'Opportunity: ' + (currentOppName || 'Not set') + '\n\n' +

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

    '═══ AVAILABLE OPPORTUNITIES (open) ═══\n' +
    opportunityContext + '\n\n' +

    '═══ TASK CATEGORIES ═══\n' +
    CATS.join(', ') + '\n\n' +

    'Return ONLY a valid JSON object with two keys:\n' +
    '{\n' +
    '  "tasks": [\n' +
    '    {\n' +
    '      "item": "concise task name (imperative verb)",\n' +
    '      "notes": "detailed context with sub-items, deadlines, discussion points",\n' +
    '      "importance": "Critical" | "Important" | "When Time Allows",\n' +
    '      "category": "from categories list",\n' +
    '      "client": "exact client name or empty string",\n' +
    '      "est": estimated_minutes,\n' +
    '      "campaign": "exact campaign name or empty string"\n' +
    '    }\n' +
    '  ],\n' +
    '  "suggestions": [\n' +
    '    {\n' +
    '      "type": "link_campaign" | "link_opportunity" | "create_opportunity" | "suggest_client" | "suggest_end_client",\n' +
    '      "campaign_name": "for link_campaign",\n' +
    '      "opportunity_name": "for link_opportunity",\n' +
    '      "suggested_name": "for create_opportunity",\n' +
    '      "suggested_type": "retain_live | fc_partnership | fc_direct (for create_opportunity)",\n' +
    '      "client": "for create_opportunity",\n' +
    '      "end_client": "for create_opportunity or suggest_end_client",\n' +
    '      "client_name": "for suggest_client",\n' +
    '      "contact_name": "for create_opportunity",\n' +
    '      "contact_email": "for create_opportunity",\n' +
    '      "reason": "brief explanation"\n' +
    '    }\n' +
    '  ]\n' +
    '}';

  // Call Claude API
  var response = await anthropic.messages.create({
    model: model,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }]
  });

  // Parse response
  var text = response.content[0].text.trim();
  var cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/g, '').trim();
  var parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse meeting AI response:', text.substring(0, 500));
    return 0;
  }

  // Handle both old format (array = tasks only) and new format (object with tasks + suggestions)
  var tasks, suggestions;
  if (Array.isArray(parsed)) {
    tasks = parsed;
    suggestions = [];
  } else {
    tasks = parsed.tasks || [];
    suggestions = parsed.suggestions || [];
  }

  // Build name → ID maps (case-insensitive)
  var campaignNameMap = {};
  campaignRecords.forEach(function(c) {
    if (c.name) campaignNameMap[c.name.toLowerCase()] = c.id;
  });
  var oppNameMap = {};
  oppRecords.forEach(function(o) {
    if (o.name) oppNameMap[o.name.toLowerCase()] = o.id;
  });

  // Insert review items
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

  // Process CRM suggestions — resolve names to IDs, add pending status
  if (suggestions.length > 0) {
    suggestions.forEach(function(s) {
      s.status = 'pending';
      if (s.type === 'link_campaign' && s.campaign_name) {
        var cid2 = campaignNameMap[s.campaign_name.toLowerCase()];
        if (cid2) s.campaign_id = cid2;
      }
      if (s.type === 'link_opportunity' && s.opportunity_name) {
        var oid = oppNameMap[s.opportunity_name.toLowerCase()];
        if (oid) s.opportunity_id = oid;
      }
    });
    // Filter out link suggestions where the name didn't resolve to a valid ID
    suggestions = suggestions.filter(function(s) {
      if (s.type === 'link_campaign' && !s.campaign_id) return false;
      if (s.type === 'link_opportunity' && !s.opportunity_id) return false;
      return true;
    });
  }

  // Mark meeting as processed and store suggestions
  var updateData = { ai_tasks_generated: true };
  if (suggestions.length > 0) updateData.ai_suggestions = suggestions;
  await supabase.from('meetings').update(updateData).eq('id', meetingRow.id);

  return inserted;
}

module.exports = { analyzeMeetingForTasks };
