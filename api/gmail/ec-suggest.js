const { verifyUserToken, getCredentials, cors } = require('../_lib/supabase');
const Anthropic = require('@anthropic-ai/sdk');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { candidates, endClients, contacts, clients } = req.body || {};
  if (!candidates || !candidates.length) return res.status(200).json({ results: [] });

  // Load Anthropic credentials
  const credRow = await getCredentials(userId, 'anthropic');
  if (!credRow || !credRow.credentials || !credRow.credentials.api_key) {
    return res.status(400).json({ error: 'Anthropic API key not configured. Add it in Settings > Integrations.' });
  }

  const model = (credRow.config && credRow.config.model) || 'claude-sonnet-4-6';
  const anthropic = new Anthropic({ apiKey: credRow.credentials.api_key });

  try {
    // Build end-client context grouped by parent client
    let ecContext = '';
    if (endClients && endClients.length) {
      const byClient = {};
      endClients.forEach(function(ec) {
        const key = ec.clientName || '(unassigned)';
        if (!byClient[key]) byClient[key] = [];
        byClient[key].push(ec.name);
      });
      ecContext = 'Existing end-clients grouped by parent client:\n';
      Object.keys(byClient).forEach(function(clientName) {
        ecContext += '  ' + clientName + ':\n';
        byClient[clientName].forEach(function(ecName) {
          // Find contacts linked to this end-client for domain context
          const linkedContacts = (contacts || []).filter(function(c) {
            return c.endClient === ecName;
          });
          const emails = linkedContacts.map(function(c) { return c.email; }).filter(Boolean).join(', ');
          ecContext += '    - ' + ecName + (emails ? ' (known emails: ' + emails + ')' : '') + '\n';
        });
      });
    }

    // Build client list context
    let clientContext = '';
    if (clients && clients.length) {
      clientContext = 'Parent clients:\n' +
        clients.map(function(c) {
          return '- ' + c.name + (c.email ? ' (' + c.email + ')' : '') + (c.status ? ' [' + c.status + ']' : '');
        }).join('\n');
    }

    // Process in batches of 50
    const BATCH_SIZE = 50;
    const allResults = [];

    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
      const batch = candidates.slice(i, i + BATCH_SIZE);

      const candidateList = batch.map(function(c, idx) {
        return (idx + 1) + '. Email: ' + c.email +
          '\n   Name: ' + (c.name || '(unknown)') +
          '\n   Parent Client: ' + (c.clientName || '(unknown)') +
          '\n   Email appearances: ' + (c.emailCount || 0) +
          '\n   Meeting appearances: ' + (c.meetingCount || 0) +
          '\n   Domain: ' + (c.email.split('@')[1] || '') +
          (c.existingContactId ? '\n   (Contact exists but has no end-client)' : '\n   (New contact)');
      }).join('\n\n');

      const prompt = `You are helping a business owner organize their contacts into end-client groups. End-clients are the actual companies/organizations that contacts belong to, nested under a parent client (agency/partner).

Your task: For each candidate contact below, determine which existing end-client they belong to, OR suggest creating a new end-client.

MATCHING RULES (in priority order):
1. **Domain clustering** (strongest signal): If an existing end-client already has contacts with the same email domain (e.g., @acme.com), the candidate almost certainly belongs to that end-client.
2. **Company name patterns**: The email domain often reflects the company name (e.g., jane@acme-corp.com → "Acme Corp").
3. **Context from name**: Sometimes the contact name or email prefix hints at the organization.
4. **Parent client grouping**: End-clients must belong to the same parent client. Never suggest an end-client that belongs to a different parent client.

CONFIDENCE LEVELS:
- "high": Domain match with existing end-client contacts, or very clear company name match
- "medium": Reasonable inference from domain/name but no existing contacts to confirm
- "low": Best guess, limited signals

Return ONLY a valid JSON array with one object per candidate, in the same order. Each object must have:
- email (string: the candidate's email)
- suggested_end_client (string: exact name of existing end-client to match, OR a new name to create)
- is_new (boolean: true if suggesting a NEW end-client that doesn't exist yet)
- confidence (string: "high", "medium", or "low")
- reason (string: brief explanation of why this match was chosen, max 20 words)

${ecContext ? '\n' + ecContext : ''}
${clientContext ? '\n' + clientContext : ''}

Candidates to analyze:

${candidateList}`;

      const response = await anthropic.messages.create({
        model: model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      });

      // Parse response
      const text = response.content[0].text.trim();
      let parsed;
      try {
        const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/g, '').trim();
        parsed = JSON.parse(cleaned);
      } catch (parseErr) {
        console.error('Failed to parse Claude response for ec-suggest:', text.substring(0, 500));
        continue;
      }

      if (Array.isArray(parsed)) {
        allResults.push(...parsed);
      }
    }

    return res.status(200).json({ results: allResults });
  } catch (e) {
    console.error('EC suggestion error:', e.message);
    return res.status(500).json({ error: 'EC suggestion failed: ' + e.message });
  }
};
