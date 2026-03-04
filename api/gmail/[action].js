const { verifyUserToken, cors, getCredentials } = require('../_lib/supabase');
const { refreshGmailToken } = require('../_lib/gmail-auth');

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

/**
 * Catch-all handler for /api/gmail/:action
 * Dispatches to threads, thread, or send based on the action param.
 */
module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action;

  if (action === 'threads') return handleThreads(req, res);
  if (action === 'thread') return handleThread(req, res);
  if (action === 'send') return handleSend(req, res);

  return res.status(404).json({ error: 'Unknown gmail action: ' + action });
};

/* ═══════════ THREADS LIST ═══════════ */
async function handleThreads(req, res) {
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
          GMAIL_API + '/threads/' + thread.id + '?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date',
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

        results.push({
          threadId: thread.id,
          subject: getHeader(firstMsg, 'Subject') || '(no subject)',
          fromName, fromEmail,
          toEmails: getHeader(firstMsg, 'To'),
          snippet: lastMsg.snippet || '',
          date: new Date(parseInt(lastMsg.internalDate)).toISOString(),
          messageCount: messages.length,
          isUnread, labels: allLabels
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
}

/* ═══════════ SINGLE THREAD ═══════════ */
async function handleThread(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const threadId = req.query.id;
  if (!threadId) return res.status(400).json({ error: 'Missing thread id' });

  try {
    const credRow = await getCredentials(userId, 'gmail');
    if (!credRow) return res.status(400).json({ error: 'Gmail not connected' });

    const accessToken = await refreshGmailToken(credRow);

    const threadResp = await fetch(
      GMAIL_API + '/threads/' + threadId + '?format=full',
      { headers: { 'Authorization': 'Bearer ' + accessToken } }
    );
    if (!threadResp.ok) {
      const err = await threadResp.text();
      throw new Error('Gmail API ' + threadResp.status + ': ' + err.substring(0, 200));
    }
    const threadData = await threadResp.json();

    const messages = (threadData.messages || []).map(function(msg) {
      const getHeader = (name) => {
        const h = (msg.payload && msg.payload.headers || []).find(h => h.name.toLowerCase() === name.toLowerCase());
        return h ? h.value : '';
      };

      const body = extractBody(msg.payload);
      const fromRaw = getHeader('From');
      const fromMatch = fromRaw.match(/^(.+?)\s*<(.+?)>$/);

      return {
        id: msg.id, threadId: msg.threadId,
        from: getHeader('From'),
        fromName: fromMatch ? fromMatch[1].replace(/"/g, '').trim() : '',
        fromEmail: fromMatch ? fromMatch[2].trim() : fromRaw.trim(),
        to: getHeader('To'), cc: getHeader('Cc'), subject: getHeader('Subject'),
        date: new Date(parseInt(msg.internalDate)).toISOString(),
        snippet: msg.snippet || '', body,
        labels: msg.labelIds || [],
        isUnread: (msg.labelIds || []).includes('UNREAD')
      };
    });

    // Mark thread as read — fire and forget
    try {
      await fetch(GMAIL_API + '/threads/' + threadId + '/modify', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ removeLabelIds: ['UNREAD'] })
      });
    } catch (e) { /* ignore */ }

    return res.status(200).json({ threadId: threadData.id, messages });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

/* ═══════════ SEND EMAIL ═══════════ */
async function handleSend(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const credRow = await getCredentials(userId, 'gmail');
    if (!credRow) return res.status(400).json({ error: 'Gmail not connected' });

    const accessToken = await refreshGmailToken(credRow);
    const { to, cc, subject, body, threadId, messageId } = req.body || {};

    if (!to) return res.status(400).json({ error: 'Missing "to" field' });
    if (!body) return res.status(400).json({ error: 'Missing email body' });

    const profileResp = await fetch(GMAIL_API + '/profile', {
      headers: { 'Authorization': 'Bearer ' + accessToken }
    });
    const profile = await profileResp.json();
    const fromEmail = profile.emailAddress || '';

    const headers = ['From: ' + fromEmail, 'To: ' + to];
    if (cc) headers.push('Cc: ' + cc);
    headers.push('Subject: ' + (subject || ''));
    headers.push('Content-Type: text/html; charset=utf-8');
    headers.push('MIME-Version: 1.0');
    if (messageId) {
      headers.push('In-Reply-To: ' + messageId);
      headers.push('References: ' + messageId);
    }

    const rawEmail = headers.join('\r\n') + '\r\n\r\n' + body;
    const encoded = Buffer.from(rawEmail)
      .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const sendBody = { raw: encoded };
    if (threadId) sendBody.threadId = threadId;

    const sendResp = await fetch(GMAIL_API + '/messages/send', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify(sendBody)
    });

    if (!sendResp.ok) {
      const err = await sendResp.text();
      throw new Error('Gmail send failed (' + sendResp.status + '): ' + err.substring(0, 200));
    }

    const result = await sendResp.json();
    return res.status(200).json({ success: true, messageId: result.id, threadId: result.threadId });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

/* ═══════════ HELPERS ═══════════ */
function extractBody(payload) {
  if (!payload) return '';
  if (payload.body && payload.body.data) return decodeBase64Url(payload.body.data);

  const parts = payload.parts || [];
  let htmlBody = '', textBody = '';

  for (const part of parts) {
    if (part.mimeType === 'text/html' && part.body && part.body.data) {
      htmlBody = decodeBase64Url(part.body.data);
    } else if (part.mimeType === 'text/plain' && part.body && part.body.data) {
      textBody = decodeBase64Url(part.body.data);
    } else if (part.parts) {
      const nested = extractBody(part);
      if (nested) {
        if (part.mimeType && part.mimeType.includes('html')) htmlBody = nested;
        else if (!htmlBody) htmlBody = nested;
      }
    }
  }
  return htmlBody || textBody;
}

function decodeBase64Url(data) {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}
