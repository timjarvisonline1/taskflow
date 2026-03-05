const { getServiceClient, verifyUserToken, getCredentials, cors } = require('../_lib/supabase');
const Anthropic = require('@anthropic-ai/sdk');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { threads, clients, contacts } = req.body || {};
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
          (c.clientName ? ' → ' + c.clientName : '') + (c.endClient ? ' / ' + c.endClient : '')).join('\n');
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
          '\n   Last message: ' + (t.lastMessageAt || '');
      }).join('\n\n');

      const prompt = `Analyze these email threads and determine which require a reply from the user (Tim Jarvis, who runs two businesses: Tim Jarvis Online LLC and Film&Content LLC).

Return ONLY a valid JSON array with one object per thread, in the same order as the input. Each object must have these exact fields:
- thread_id (string: the Thread ID from the input)
- needs_reply (boolean: true if the email requires a reply)
- summary (string: 1-2 sentences describing what the sender needs — empty string if needs_reply is false)
- urgency (string: "critical", "high", "normal", or "low" — "low" if needs_reply is false)
- category (string: best match from the list below — empty string if needs_reply is false)

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

Urgency guidance:
- "critical": urgent deadline, financial matter, time-sensitive client request
- "high": important client or partner communication, meeting request, business proposal
- "normal": standard communication that needs a response but isn't urgent
- "low": low priority or purely informational but still warrants a reply

Category options: Comms, Finance, Campaign Mgmt, Sales, Admin, Reporting, Content, Strategy, One-on-One, Discovery Call, Pitch Meeting, Tracking, Retain Live

${clientContext ? '\n' + clientContext + '\n' : ''}
Threads to analyze:

${threadList}`;

      const response = await anthropic.messages.create({
        model: model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      });

      // Parse response
      const text = response.content[0].text.trim();
      let parsed;
      try {
        // Strip markdown code fences if present
        const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/g, '').trim();
        parsed = JSON.parse(cleaned);
      } catch (parseErr) {
        console.error('Failed to parse Claude response:', text.substring(0, 500));
        continue;
      }

      if (Array.isArray(parsed)) {
        allResults.push(...parsed);
      }
    }

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
        ai_analyzed_at: now
      };

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
