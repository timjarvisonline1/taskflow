const { verifyUserToken, cors, getCredentials, getServiceClient } = require('../_lib/supabase');
const { refreshGmailToken } = require('../_lib/gmail-auth');

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

/**
 * POST /api/gmail/batch-archive
 * Archives multiple Gmail threads in parallel.
 * Body: { threadIds: string[] }
 */
module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { threadIds } = req.body || {};
  if (!Array.isArray(threadIds) || !threadIds.length) {
    return res.status(400).json({ error: 'Missing threadIds array' });
  }
  if (threadIds.length > 50) {
    return res.status(400).json({ error: 'Max 50 threads per batch' });
  }

  try {
    const credRow = await getCredentials(userId, 'gmail');
    if (!credRow) return res.status(400).json({ error: 'Gmail not connected' });

    const accessToken = await refreshGmailToken(credRow);
    const client = getServiceClient();

    // Archive all threads in parallel (Gmail API + Supabase update)
    const results = await Promise.allSettled(
      threadIds.map(async (threadId) => {
        const resp = await fetch(GMAIL_API + '/threads/' + threadId + '/modify', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + accessToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ removeLabelIds: ['INBOX'] })
        });
        if (!resp.ok) throw new Error('Gmail ' + resp.status);

        // Update Supabase labels
        const { data: row } = await client
          .from('gmail_threads')
          .select('id, labels')
          .eq('user_id', userId)
          .eq('thread_id', threadId)
          .single();

        if (row) {
          const newLabels = (row.labels || '').split(',')
            .filter(function(l) { return l !== 'INBOX'; }).join(',');
          await client.from('gmail_threads').update({ labels: newLabels })
            .eq('id', row.id);
        }
        return threadId;
      })
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    const failed = results.filter(r => r.status === 'rejected').length;

    return res.status(200).json({ succeeded, failed, total: threadIds.length });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
