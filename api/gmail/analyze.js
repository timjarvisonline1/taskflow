const { getServiceClient, verifyUserToken, getCredentials, cors } = require('../_lib/supabase');
const Anthropic = require('@anthropic-ai/sdk');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { threads, clients, contacts, campaigns, opportunities } = req.body || {};
  if (!threads || !threads.length) return res.status(200).json({ results: [] });

  // Load Anthropic credentials
  const credRow = await getCredentials(userId, 'anthropic');
  if (!credRow || !credRow.credentials || !credRow.credentials.api_key) {
    return res.status(400).json({ error: 'Anthropic API key not configured. Add it in Settings > Integrations.' });
  }

  const model = (credRow.config && credRow.config.model) || 'claude-sonnet-4-6';
  const anthropic = new Anthropic({ apiKey: credRow.credentials.api_key });
  const client = getServiceClient();

  try {
    // Build client context string
    let clientContext = '';
    if (clients && clients.length) {
      clientContext = 'Active clients and their email domains:\n' +
        clients.map(c => '- ' + c.name + (c.email ? ' (' + c.email + ')' : '') + (c.status ? ' [' + c.status + ']' : '')).join('\n');
    }
    if (contacts && contacts.length) {
      clientContext += '\n\nKnown contacts:\n' +
        contacts.slice(0, 50).map(c => '- ' + (c.firstName || '') + ' ' + (c.lastName || '') + ' <' + c.email + '>' +
          (c.clientName ? ' \u2192 ' + c.clientName : '') + (c.endClient ? ' / ' + c.endClient : '')).join('\n');
    }
    if (campaigns && campaigns.length) {
      clientContext += '\n\nActive/Setup campaigns:\n' +
        campaigns.map(c => '- ID: ' + c.id + ' | Name: ' + c.name +
          (c.partner ? ' | Client: ' + c.partner : '') +
          (c.endClient ? ' | End-Client: ' + c.endClient : '') +
          (c.status ? ' [' + c.status + ']' : '')).join('\n');
    }
    if (opportunities && opportunities.length) {
      clientContext += '\n\nOpen opportunities:\n' +
        opportunities.map(o => '- ID: ' + o.id + ' | Name: ' + o.name +
          (o.client ? ' | Client: ' + o.client : '') +
          (o.endClient ? ' | End-Client: ' + o.endClient : '') +
          (o.contactName ? ' | Contact: ' + o.contactName : '') +
          (o.contactEmail ? ' <' + o.contactEmail + '>' : '') +
          (o.stage ? ' [' + o.stage + ']' : '')).join('\n');
    }

    // Process in batches of 30
    const BATCH_SIZE = 30;
    const allResults = [];

    for (let i = 0; i < threads.length; i += BATCH_SIZE) {
      const batch = threads.slice(i, i + BATCH_SIZE);

      const threadList = batch.map((t, idx) => {
        return (idx + 1) + '. Thread ID: ' + t.threadId +
          '\n   From: ' + (t.fromName || '') + ' <' + (t.fromEmail || '') + '>' +
          '\n   To: ' + (t.toEmails || '') +
          (t.ccEmails ? '\n   CC: ' + t.ccEmails : '') +
          '\n   Subject: ' + (t.subject || '(no subject)') +
          '\n   Snippet: ' + (t.snippet || '') +
          '\n   Messages: ' + (t.messageCount || 1) +
          '\n   Labels: ' + (t.labels || '') +
          '\n   Last message: ' + (t.lastMessageAt || '') +
          '\n   User sent last: ' + (t.userSentLast ? 'yes' : 'no');
      }).join('\n\n');

      const systemPrompt = `You are an email analysis assistant for Tim Jarvis, who runs two businesses: Tim Jarvis Online LLC (consulting, training, speaking) and Film&Content LLC (video production, content strategy, digital advertising).

Return ONLY a valid JSON array with one object per thread, in the same order as the input. Each object must have these exact fields:
- thread_id (string: the Thread ID from the input)
- needs_reply (boolean: true if the email requires a reply from the user)
- summary (string: 1-2 sentences describing the thread content — ALWAYS populate this for every thread)
- urgency (string: "critical", "high", "normal", or "low" — ALWAYS populate)
- category (string: best match from the category list — ALWAYS populate)
- sentiment (string: "positive", "neutral", "cautious", or "negative")
- has_meeting (boolean: true if the thread involves scheduling or meeting requests)
- meeting_details (string: brief "what + when" if has_meeting is true, else empty string)
- needs_followup (boolean: true if the user made an unresolved commitment in this thread)
- followup_details (string: what the user promised to do, else empty string)
- suggested_client (string: exact client name from the list below if you can infer which client this relates to, else empty string)
- suggested_end_client (string: exact end-client name from campaign/opportunity context if you can infer it, else empty string)
- suggested_campaign (string: exact campaign ID from the list below if this email relates to a specific campaign, else empty string)
- suggested_opportunity (string: exact opportunity ID from the list below if this email relates to a specific opportunity, else empty string)
- suggested_task (object or null: if the email implies a clear task beyond just replying, return {"item": "task description", "notes": "context from email", "importance": "Critical" or "Important" or "When Time Allows", "category": "best match", "est": estimated_minutes}. Return null if no task is warranted)

═══ NEEDS REPLY RULES ═══

An email NEEDS a reply if it contains:
- A direct question aimed at the user
- A request for information, feedback, approval, or a decision
- A meeting request, scheduling query, or calendar-related ask
- A proposal, quote, or business enquiry expecting a response
- A personal or professional message where not replying would be rude or damaging
- A client or partner communication that expects acknowledgement
- An invoice query or financial matter requiring action

An email DOES NOT need a reply if it is:
- Marketing, promotional, or newsletter content
- Automated notifications (system alerts, platform updates, shipping confirmations, login alerts)
- No-reply sender addresses
- CC/BCC where the user is not the primary recipient and no action is directed at them
- Receipts, order confirmations, or transactional emails
- Spam or irrelevant outreach
- Auto-replies or out-of-office messages
- Subscription confirmations or unsubscribe notices
- Social media notifications
- Calendar event confirmations with no question attached

If "User sent last: yes", needs_reply should almost always be false (the user already replied). Focus on whether needs_followup applies instead.

═══ URGENCY ═══
- "critical": urgent deadline, financial matter, time-sensitive client request
- "high": important client or partner communication, meeting request, business proposal
- "normal": standard communication that needs a response but isn't urgent
- "low": low priority, purely informational, or marketing/automated

═══ SENTIMENT ═══
- "positive": appreciative, satisfied, enthusiastic, good news, praise
- "neutral": factual, routine, informational, standard business communication
- "cautious": concerned, requesting clarification, hesitant, flagging potential issues
- "negative": frustrated, complaint, escalation, dissatisfied, demanding

═══ MEETING DETECTION ═══
Set has_meeting=true if the thread discusses scheduling, meeting requests, calendar coordination, "let's meet", "can we hop on a call", or mentions specific dates/times for meetings.
meeting_details should be a brief description like "Strategy review, Thursday 2pm" or "Scheduling Q1 planning session".

═══ FOLLOW-UP DETECTION ═══
Set needs_followup=true if the user (Tim Jarvis) appears to have made a commitment in this thread that seems undelivered: "I'll send that", "let me check", "I'll follow up", "will get back to you", "I'll prepare", "I'll look into it", "I'll have that ready by".
followup_details should describe what was promised, e.g. "Promised to send revised proposal by Friday".

═══ SMART CRM MATCHING ═══
Based on sender name, email domain, subject line, and conversation content, infer which client, end-client, campaign, and/or opportunity from the lists below this relates to:
- suggested_client: Return the exact client name string as it appears in the clients list. Return empty string if unsure.
- suggested_end_client: Return the exact end-client name from the campaigns/opportunities context. Return empty string if unsure.
- suggested_campaign: Return the exact campaign ID (not name) if this email clearly relates to a specific campaign. Return empty string if unsure.
- suggested_opportunity: Return the exact opportunity ID (not name) if this email clearly relates to a specific opportunity. Return empty string if unsure.
Match using sender/recipient email addresses, contact associations, subject keywords, and campaign/opportunity names.

═══ TASK SUGGESTION ═══
If the email implies a clear actionable task the user should do (beyond just hitting reply), suggest it. Examples:
- "Review and sign contract from [sender]"
- "Prepare campaign report for Q1"
- "Schedule follow-up meeting with [client]"
- "Send invoice for [project]"
Return null if no distinct task is warranted (a simple reply doesn't count as a task).

═══ CATEGORIES ═══
Comms, Finance, Campaign Mgmt, Sales, Admin, Reporting, Content, Strategy, One-on-One, Discovery Call, Pitch Meeting, Tracking, Retain Live

${clientContext ? '\n' + clientContext + '\n' : ''}`;

      const userPrompt = `Threads to analyze:

${threadList}`;

      const response = await anthropic.messages.create({
        model: model,
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      });

      // Parse response
      const text = response.content[0].text.trim();
      let parsed;
      try {
        // Strip markdown code fences if present
        const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/g, '').trim();
        parsed = JSON.parse(cleaned);
      } catch (parseErr) {
        console.error('Failed to parse Claude response for batch, attempting per-thread extraction:', parseErr.message);
        // Attempt to extract individual thread results from partial/malformed JSON
        parsed = [];
        const threadIdPattern = /"thread_id"\s*:\s*"([^"]+)"/g;
        let match;
        while ((match = threadIdPattern.exec(text)) !== null) {
          try {
            // Find the object containing this thread_id
            const start = text.lastIndexOf('{', match.index);
            let depth = 0, end = start;
            for (let ci = start; ci < text.length; ci++) {
              if (text[ci] === '{') depth++;
              else if (text[ci] === '}') { depth--; if (depth === 0) { end = ci + 1; break; } }
            }
            if (end > start) {
              const obj = JSON.parse(text.substring(start, end));
              if (obj.thread_id) parsed.push(obj);
            }
          } catch (e) { /* skip malformed individual result */ }
        }
        if (!parsed.length) {
          console.error('Could not extract any results from malformed response:', text.substring(0, 500));
          // Log failure to sync_log for visibility
          try {
            await client.from('sync_log').insert({
              user_id: userId, platform: 'gmail', action: 'analyze_parse_failure',
              details: 'Batch parse failed, ' + batch.length + ' threads affected',
              created_at: new Date().toISOString()
            });
          } catch (logErr) { /* best effort */ }
          continue;
        }
        console.log('Recovered ' + parsed.length + ' of ' + batch.length + ' results from malformed response');
      }

      if (Array.isArray(parsed)) {
        allResults.push(...parsed);
      }
    }

    // Load client records for CRM auto-association
    const { data: clientRecords } = await client
      .from('clients')
      .select('id, name')
      .eq('user_id', userId);
    const clientNameMap = {};
    (clientRecords || []).forEach(function(c) {
      if (c.name) clientNameMap[c.name.toLowerCase()] = c.id;
    });

    // Update gmail_threads with results
    const now = new Date().toISOString();
    const updateResults = [];

    for (const result of allResults) {
      if (!result.thread_id) continue;

      const updateData = {
        needs_reply: result.needs_reply === true,
        ai_summary: result.summary || '',
        ai_urgency: result.urgency || 'normal',
        ai_category: result.category || '',
        ai_sentiment: result.sentiment || 'neutral',
        has_meeting: result.has_meeting === true,
        meeting_details: result.meeting_details || '',
        needs_followup: result.needs_followup === true,
        followup_details: result.followup_details || '',
        ai_client_name: result.suggested_client || '',
        ai_suggested_task: result.suggested_task ? JSON.stringify(result.suggested_task) : '',
        ai_analyzed_at: now
      };

      // CRM auto-association: check existing values first, then apply AI suggestions
      const { data: threadRow } = await client
        .from('gmail_threads')
        .select('client_id, end_client, campaign_id, opportunity_id')
        .eq('user_id', userId)
        .eq('thread_id', result.thread_id)
        .single();

      if (threadRow) {
        // Auto-set client_id
        if (!threadRow.client_id && result.suggested_client) {
          const matchedId = clientNameMap[result.suggested_client.toLowerCase()];
          if (matchedId) updateData.client_id = matchedId;
        }
        // Auto-set end_client
        if (!threadRow.end_client && result.suggested_end_client) {
          updateData.end_client = result.suggested_end_client;
          const { data: ecRow } = await client.from('end_clients')
            .select('id').eq('user_id', userId).eq('name', result.suggested_end_client).maybeSingle();
          if (ecRow) updateData.end_client_id = ecRow.id;
        }
        // Auto-set campaign_id
        if (!threadRow.campaign_id && result.suggested_campaign) {
          updateData.campaign_id = result.suggested_campaign;
        }
        // Auto-set opportunity_id
        if (!threadRow.opportunity_id && result.suggested_opportunity) {
          updateData.opportunity_id = result.suggested_opportunity;
        }
      }

      const { error } = await client
        .from('gmail_threads')
        .update(updateData)
        .eq('user_id', userId)
        .eq('thread_id', result.thread_id);

      if (!error) {
        updateResults.push({ threadId: result.thread_id, ...updateData });
      }
    }

    return res.status(200).json({
      analyzed: updateResults.length,
      results: updateResults
    });
  } catch (e) {
    console.error('Email analysis error:', e.message);
    return res.status(500).json({ error: 'Analysis failed: ' + e.message });
  }
};
