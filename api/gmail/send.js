const { verifyUserToken, cors, getCredentials } = require('../_lib/supabase');
const { refreshGmailToken } = require('../_lib/gmail-auth');

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

/**
 * POST /api/gmail/send
 * Sends a new email or reply via Gmail API.
 * Body: { to, cc?, subject, body, threadId?, messageId? }
 */
module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
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
};
