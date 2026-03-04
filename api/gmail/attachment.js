const { verifyUserToken, cors, getCredentials } = require('../_lib/supabase');
const { refreshGmailToken } = require('../_lib/gmail-auth');

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

/**
 * GET /api/gmail/attachment?messageId=MSG_ID&attachmentId=ATT_ID
 * Fetches attachment data from Gmail API.
 * Returns: { data, filename, mimeType, size }
 */
module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { messageId, attachmentId } = req.query;
  if (!messageId || !attachmentId) {
    return res.status(400).json({ error: 'Missing messageId or attachmentId' });
  }

  try {
    const credRow = await getCredentials(userId, 'gmail');
    if (!credRow) return res.status(400).json({ error: 'Gmail not connected' });

    const accessToken = await refreshGmailToken(credRow);

    const attResp = await fetch(
      GMAIL_API + '/messages/' + messageId + '/attachments/' + attachmentId,
      { headers: { 'Authorization': 'Bearer ' + accessToken } }
    );

    if (!attResp.ok) {
      const err = await attResp.text();
      throw new Error('Gmail API ' + attResp.status + ': ' + err.substring(0, 200));
    }

    const attData = await attResp.json();
    return res.status(200).json({
      data: attData.data || '',
      size: attData.size || 0
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
