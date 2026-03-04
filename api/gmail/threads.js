const { verifyUserToken, cors, getCredentials } = require('../_lib/supabase');
const { refreshGmailToken } = require('../_lib/gmail-auth');

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

/**
 * GET /api/gmail/threads
 * Lists Gmail threads with metadata (inbox, sent, or all).
 * Query params: maxResults, pageToken, label (inbox|sent|all), q (search)
 */
module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const credRow = await getCredentials(userId, 'gmail');
    if (!credRow) return res.status(400).json({ error: 'Gmail not connected' });

    const accessToken = await refreshGmailToken(credRow);

    const maxResults = Math.min(parseInt(req.query.maxResults) || 25, 50);
    const pageToken = req.query.pageToken || '';
    const label = req.query.label || 'inbox';
    const search = req.query.q || '';

    let labelIds = '';
    if (label === 'inbox') labelIds = 'INBOX';
    else if (label === 'sent') labelIds = 'SENT';

    const params = new URLSearchParams({ maxResults: String(maxResults) });
    if (labelIds) params.set('labelIds', labelIds);
    if (search) params.set('q', search);
    if (pageToken) params.set('pageToken', pageToken);

    const listResp = await fetch(GMAIL_API + '/threads?' + params.toString(), {
      headers: { 'Authorization': 'Bearer ' + accessToken }
    });
    if (!listResp.ok) {
      const err = await listResp.text();
      throw new Error('Gmail API ' + listResp.status + ': ' + err.substring(0, 200));
    }
    const listData = await listResp.json();
    const threads = listData.threads || [];

    const results = [];
    for (const thread of threads) {
      try {
        const threadResp = await fetch(
          GMAIL_API + '/threads/' + thread.id + '?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=Cc',
          { headers: { 'Authorization': 'Bearer ' + accessToken } }
        );
        if (!threadResp.ok) continue;
        const threadData = await threadResp.json();

        const messages = threadData.messages || [];
        if (!messages.length) continue;

        const firstMsg = messages[0];
        const lastMsg = messages[messages.length - 1];

        const getHeader = (msg, name) => {
          const h = (msg.payload && msg.payload.headers || []).find(h => h.name.toLowerCase() === name.toLowerCase());
          return h ? h.value : '';
        };

        const fromRaw = getHeader(firstMsg, 'From');
        const fromMatch = fromRaw.match(/^(.+?)\s*<(.+?)>$/);
        const fromName = fromMatch ? fromMatch[1].replace(/"/g, '').trim() : '';
        const fromEmail = fromMatch ? fromMatch[2].trim() : fromRaw.trim();

        const lastLabels = lastMsg.labelIds || [];
        const isUnread = lastLabels.includes('UNREAD');
        const allLabels = [...new Set(messages.flatMap(m => m.labelIds || []))];

        // Parse last message From for direction tracking
        const lastFromRaw = getHeader(lastMsg, 'From');
        const lastFromMatch = lastFromRaw.match(/<(.+?)>/);
        const lastMessageFromEmail = lastFromMatch ? lastFromMatch[1].trim() : lastFromRaw.trim();

        results.push({
          threadId: thread.id,
          subject: getHeader(firstMsg, 'Subject') || '(no subject)',
          fromName, fromEmail,
          toEmails: getHeader(firstMsg, 'To'),
          ccEmails: getHeader(firstMsg, 'Cc') || '',
          snippet: lastMsg.snippet || '',
          date: new Date(parseInt(lastMsg.internalDate)).toISOString(),
          messageCount: messages.length,
          isUnread, labels: allLabels,
          lastMessageFromEmail
        });
      } catch (e) { /* skip */ }
    }

    return res.status(200).json({
      threads: results,
      nextPageToken: listData.nextPageToken || null,
      resultSizeEstimate: listData.resultSizeEstimate || 0
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
