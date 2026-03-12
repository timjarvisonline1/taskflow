const { verifyUserToken, cors, getCredentials, getServiceClient } = require('../_lib/supabase');
const { refreshGmailToken } = require('../_lib/gmail-auth');

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

/* RFC 2047 encode a MIME header value when it contains non-ASCII characters */
function mimeEncode(value) {
  if (!value || !/[^\x00-\x7F]/.test(value)) return value;
  return '=?UTF-8?B?' + Buffer.from(value, 'utf-8').toString('base64') + '?=';
}

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
    const { to, cc, bcc, subject, body, threadId, messageId, attachments } = req.body || {};

    if (!to) return res.status(400).json({ error: 'Missing "to" field' });
    if (!body) return res.status(400).json({ error: 'Missing email body' });

    const profileResp = await fetch(GMAIL_API + '/profile', {
      headers: { 'Authorization': 'Bearer ' + accessToken }
    });
    const profile = await profileResp.json();
    const fromEmail = profile.emailAddress || '';

    /* Fetch display name from Gmail sendAs settings for proper From header */
    let fromName = '';
    try {
      const sendAsResp = await fetch(GMAIL_API + '/settings/sendAs', {
        headers: { 'Authorization': 'Bearer ' + accessToken }
      });
      if (sendAsResp.ok) {
        const sendAsData = await sendAsResp.json();
        const primary = (sendAsData.sendAs || []).find(function(s) {
          return s.isPrimary || s.sendAsEmail === fromEmail;
        });
        if (primary && primary.displayName) fromName = primary.displayName;
      }
    } catch (e) { /* non-fatal: fall back to other sources */ }

    /* Fallback: get display name from Supabase auth user metadata */
    if (!fromName) {
      try {
        const client = getServiceClient();
        const { data: { user } } = await client.auth.admin.getUserById(userId);
        if (user && user.user_metadata) {
          fromName = user.user_metadata.full_name || user.user_metadata.name || '';
        }
      } catch (e) { /* non-fatal: fall back to bare email */ }
    }

    const fromHeader = fromName ? mimeEncode(fromName) + ' <' + fromEmail + '>' : fromEmail;

    let rawEmail;
    const hasAttachments = attachments && attachments.length > 0;

    if (hasAttachments) {
      /* ── Multipart MIME with attachments ── */
      const boundary = 'boundary_' + Date.now() + '_' + Math.random().toString(36).substring(2);
      const mimeHeaders = ['From: ' + fromHeader, 'To: ' + to];
      if (cc) mimeHeaders.push('Cc: ' + cc);
      if (bcc) mimeHeaders.push('Bcc: ' + bcc);
      mimeHeaders.push('Subject: ' + mimeEncode(subject || ''));
      mimeHeaders.push('MIME-Version: 1.0');
      mimeHeaders.push('Content-Type: multipart/mixed; boundary="' + boundary + '"');
      if (messageId) {
        mimeHeaders.push('In-Reply-To: ' + messageId);
        mimeHeaders.push('References: ' + messageId);
      }

      let mimeParts = mimeHeaders.join('\r\n') + '\r\n\r\n';
      /* HTML body part */
      mimeParts += '--' + boundary + '\r\n';
      mimeParts += 'Content-Type: text/html; charset=utf-8\r\n\r\n';
      mimeParts += body + '\r\n\r\n';

      /* Attachment parts */
      for (const att of attachments) {
        mimeParts += '--' + boundary + '\r\n';
        mimeParts += 'Content-Type: ' + (att.mimeType || 'application/octet-stream') + '; name="' + att.filename + '"\r\n';
        mimeParts += 'Content-Disposition: attachment; filename="' + att.filename + '"\r\n';
        mimeParts += 'Content-Transfer-Encoding: base64\r\n\r\n';
        mimeParts += att.data + '\r\n\r\n';
      }
      mimeParts += '--' + boundary + '--';
      rawEmail = mimeParts;
    } else {
      /* ── Simple single-part email ── */
      const headers = ['From: ' + fromHeader, 'To: ' + to];
      if (cc) headers.push('Cc: ' + cc);
      if (bcc) headers.push('Bcc: ' + bcc);
      headers.push('Subject: ' + mimeEncode(subject || ''));
      headers.push('Content-Type: text/html; charset=utf-8');
      headers.push('MIME-Version: 1.0');
      if (messageId) {
        headers.push('In-Reply-To: ' + messageId);
        headers.push('References: ' + messageId);
      }
      rawEmail = headers.join('\r\n') + '\r\n\r\n' + body;
    }

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
