const { getServiceClient, cors } = require('../_lib/supabase');

/**
 * POST /api/webhook/instantly?secret=xxx
 * Receives webhook events from Instantly.ai (e.g., reply_received).
 * Upserts the email into instantly_emails for the matched user.
 */
module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const secret = req.query.secret || '';
  if (!secret) return res.status(401).json({ error: 'Missing webhook secret' });

  const client = getServiceClient();

  try {
    // Find user by webhook secret in Instantly integration config
    const { data: creds } = await client
      .from('integration_credentials')
      .select('user_id, config')
      .eq('platform', 'instantly')
      .eq('is_active', true);

    const matched = (creds || []).find(function(c) {
      return c.config && c.config.webhook_secret === secret;
    });

    if (!matched) return res.status(401).json({ error: 'Invalid webhook secret' });
    const userId = matched.user_id;

    const event = req.body || {};
    const eventType = event.event_type || event.type || '';

    // Handle reply_received events
    if (eventType === 'reply_received' || eventType === 'email.replied') {
      const emailData = event.data || event;
      const emailId = emailData.id || emailData.email_id || emailData.uuid;
      if (!emailId) return res.status(200).json({ ok: true, action: 'skipped', reason: 'no email id' });

      // Look up campaign
      const campaignInstantlyId = emailData.campaign_id || '';
      let campaignUuid = null;
      if (campaignInstantlyId) {
        const { data: campRow } = await client
          .from('instantly_campaigns')
          .select('id')
          .eq('user_id', userId)
          .eq('instantly_id', campaignInstantlyId)
          .maybeSingle();
        if (campRow) campaignUuid = campRow.id;
      }

      // Look up lead
      const leadInstantlyId = emailData.lead_id || emailData.lead || '';
      let leadUuid = null;
      if (leadInstantlyId) {
        const { data: leadRow } = await client
          .from('instantly_leads')
          .select('id')
          .eq('user_id', userId)
          .eq('instantly_id', leadInstantlyId)
          .maybeSingle();
        if (leadRow) leadUuid = leadRow.id;
      }

      const row = {
        user_id: userId,
        instantly_id: emailId,
        lead_id: leadUuid,
        campaign_id: campaignUuid,
        from_email: emailData.from_address || emailData.from_email || emailData.from || '',
        from_name: emailData.from_name || '',
        to_email: emailData.to_address || emailData.to_email || emailData.to || '',
        subject: emailData.subject || '',
        body: emailData.body || emailData.html_body || '',
        body_text: emailData.text_body || emailData.body_text || '',
        timestamp_ext: emailData.timestamp || emailData.sent_at || new Date().toISOString(),
        is_reply: true,
        direction: 'inbound',
        reply_status: 'pending',
        metadata: JSON.stringify({ source: 'webhook', event_type: eventType }),
        synced_at: new Date().toISOString()
      };

      const { error } = await client
        .from('instantly_emails')
        .upsert(row, { onConflict: 'user_id,instantly_id' });

      if (error) {
        console.error('Webhook upsert error:', error.message);
        return res.status(200).json({ ok: true, action: 'error', error: error.message });
      }

      return res.status(200).json({ ok: true, action: 'upserted', email_id: emailId });
    }

    // Unknown event type — acknowledge but skip
    return res.status(200).json({ ok: true, action: 'skipped', event_type: eventType });
  } catch (e) {
    console.error('Instantly webhook error:', e.message);
    return res.status(200).json({ ok: true, error: e.message });
  }
};
