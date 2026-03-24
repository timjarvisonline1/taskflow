/**
 * POST /api/gmail/ai-draft-send
 * Send an AI draft via Gmail. Updates draft status and gmail_threads.
 * Body: { id }
 */
const { getServiceClient, verifyUserToken, cors, getCredentials } = require('../_lib/supabase');
const { refreshGmailToken } = require('../_lib/gmail-auth');

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

function mimeEncode(value) {
  if (!value || !/[^\x00-\x7F]/.test(value)) return value;
  return '=?UTF-8?B?' + Buffer.from(value, 'utf-8').toString('base64') + '?=';
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  var userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    var body = req.body || {};
    if (!body.id) return res.status(400).json({ error: 'Missing draft id' });

    var client = getServiceClient();

    /* Load the draft */
    var draftRes = await client.from('ai_email_drafts')
      .select('*')
      .eq('id', body.id)
      .eq('user_id', userId)
      .single();
    if (draftRes.error || !draftRes.data) return res.status(404).json({ error: 'Draft not found' });
    var draft = draftRes.data;

    /* Get Gmail credentials */
    var credRow = await getCredentials(userId, 'gmail');
    if (!credRow) return res.status(400).json({ error: 'Gmail not connected' });
    var accessToken = await refreshGmailToken(credRow);

    /* Get sender info */
    var profileResp = await fetch(GMAIL_API + '/profile', {
      headers: { 'Authorization': 'Bearer ' + accessToken }
    });
    var profile = await profileResp.json();
    var fromEmail = profile.emailAddress || '';

    var fromName = '';
    try {
      var sendAsResp = await fetch(GMAIL_API + '/settings/sendAs', {
        headers: { 'Authorization': 'Bearer ' + accessToken }
      });
      if (sendAsResp.ok) {
        var sendAsData = await sendAsResp.json();
        var primary = (sendAsData.sendAs || []).find(function(s) { return s.isPrimary || s.sendAsEmail === fromEmail; });
        if (primary && primary.displayName) fromName = primary.displayName;
      }
    } catch (e) { /* non-fatal */ }

    if (!fromName) {
      try {
        var userData = await client.auth.admin.getUserById(userId);
        if (userData.data && userData.data.user && userData.data.user.user_metadata) {
          fromName = userData.data.user.user_metadata.full_name || userData.data.user.user_metadata.name || '';
        }
      } catch (e) { /* non-fatal */ }
    }

    var fromHeader = fromName ? mimeEncode(fromName) + ' <' + fromEmail + '>' : fromEmail;

    /* Parse recipients */
    var toAddresses = '';
    try { toAddresses = JSON.parse(draft.to_addresses || '[]').join(', '); } catch (e) { toAddresses = draft.to_addresses || ''; }
    var ccAddresses = '';
    try { var ccArr = JSON.parse(draft.cc_addresses || '[]'); if (ccArr.length) ccAddresses = ccArr.join(', '); } catch (e) {}

    if (!toAddresses) return res.status(400).json({ error: 'No recipients' });

    /* Build MIME email */
    var headers = ['From: ' + fromHeader, 'To: ' + toAddresses];
    if (ccAddresses) headers.push('Cc: ' + ccAddresses);
    headers.push('Subject: ' + mimeEncode(draft.subject || ''));
    headers.push('Content-Type: text/html; charset=utf-8');
    headers.push('MIME-Version: 1.0');
    if (draft.message_id) {
      headers.push('In-Reply-To: ' + draft.message_id);
      headers.push('References: ' + draft.message_id);
    }
    var rawEmail = headers.join('\r\n') + '\r\n\r\n' + (draft.body_html || '');

    var encoded = Buffer.from(rawEmail)
      .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    var sendBody = { raw: encoded };
    if (draft.thread_id) sendBody.threadId = draft.thread_id;

    var sendResp = await fetch(GMAIL_API + '/messages/send', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify(sendBody)
    });

    if (!sendResp.ok) {
      var errText = await sendResp.text();
      throw new Error('Gmail send failed (' + sendResp.status + '): ' + errText.substring(0, 200));
    }

    var sendResult = await sendResp.json();

    /* Update draft status */
    await client.from('ai_email_drafts')
      .update({ status: 'sent', sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', draft.id);

    /* Update gmail_threads */
    await client.from('gmail_threads')
      .update({ needs_reply: false, reply_status: 'replied' })
      .eq('user_id', userId)
      .eq('thread_id', draft.thread_id);

    /* Archive thread (remove INBOX label) — same as compose sendEmail flow */
    try {
      await fetch(GMAIL_API + '/threads/' + draft.thread_id + '/modify', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ removeLabelIds: ['INBOX'] })
      });
      /* Update Supabase labels */
      var threadRow = await client.from('gmail_threads')
        .select('id, labels')
        .eq('user_id', userId)
        .eq('thread_id', draft.thread_id)
        .single();
      if (threadRow.data) {
        var newLabels = (threadRow.data.labels || '').split(',')
          .filter(function(l) { return l !== 'INBOX'; }).join(',');
        await client.from('gmail_threads').update({ labels: newLabels }).eq('id', threadRow.data.id);
      }
    } catch (archiveErr) { /* non-fatal */ }

    return res.status(200).json({ success: true, gmail_message_id: sendResult.id });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
