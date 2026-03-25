/**
 * POST /api/gmail/reset-analysis
 * One-time utility: resets AI analysis on all INBOX threads so they get
 * re-analyzed with the new full-body analysis pipeline.
 */
const { getServiceClient, verifyUserToken, cors } = require('../_lib/supabase');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  var userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  var client = getServiceClient();

  try {
    /* Reset all INBOX threads for re-analysis */
    var { data, error, count } = await client
      .from('gmail_threads')
      .update({
        needs_reply: null,
        ai_analyzed_at: null,
        ai_summary: null,
        ai_urgency: null,
        ai_category: null,
        ai_sentiment: null,
        has_meeting: null,
        meeting_details: null,
        needs_followup: null,
        followup_details: null,
        ai_suggested_task: null
      })
      .eq('user_id', userId)
      .ilike('labels', '%INBOX%');

    if (error) return res.status(500).json({ error: error.message });

    /* Also reset threads that were skipped (ai_analyzed_at = 'skipped') */
    var { error: err2 } = await client
      .from('gmail_threads')
      .update({
        needs_reply: null,
        ai_analyzed_at: null,
        ai_summary: null,
        ai_urgency: null
      })
      .eq('user_id', userId)
      .eq('ai_analyzed_at', 'skipped')
      .ilike('labels', '%INBOX%');

    return res.status(200).json({ success: true, message: 'Reset complete. Refresh Email tab to trigger re-analysis.' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
