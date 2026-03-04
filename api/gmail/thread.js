const { verifyUserToken, cors, getCredentials } = require('../_lib/supabase');
const { refreshGmailToken } = require('../_lib/gmail-auth');

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

/**
 * GET /api/gmail/thread?id=THREAD_ID
 * Fetches a full Gmail thread with message bodies.
 * Marks the thread as read (fire and forget).
 */
module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
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
      const attachments = extractAttachments(msg.payload);
      const fromRaw = getHeader('From');
      const fromMatch = fromRaw.match(/^(.+?)\s*<(.+?)>$/);

      return {
        id: msg.id, threadId: msg.threadId,
        from: getHeader('From'),
        fromName: fromMatch ? fromMatch[1].replace(/"/g, '').trim() : '',
        fromEmail: fromMatch ? fromMatch[2].trim() : fromRaw.trim(),
        to: getHeader('To'), cc: getHeader('Cc'), subject: getHeader('Subject'),
        date: new Date(parseInt(msg.internalDate)).toISOString(),
        snippet: msg.snippet || '', body, attachments,
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
};

/* ═══════════ HELPERS ═══════════ */
function extractAttachments(payload) {
  const attachments = [];
  function walk(parts) {
    for (const part of (parts || [])) {
      if (part.filename && part.filename.length > 0 && part.body) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType || 'application/octet-stream',
          size: part.body.size || 0,
          attachmentId: part.body.attachmentId || ''
        });
      }
      if (part.parts) walk(part.parts);
    }
  }
  if (payload && payload.parts) walk(payload.parts);
  return attachments;
}

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
