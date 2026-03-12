const { getServiceClient, cors } = require('../_lib/supabase');

/**
 * POST /api/webhook/instantly?secret=xxx
 * Receives all webhook events from Instantly.ai.
 * Handles: reply_received, email_sent, email_opened, link_clicked, email_bounced,
 * lead_interested, lead_not_interested, lead_meeting_booked, lead_meeting_completed,
 * lead_closed, account_error
 * Upserts into instantly_events + updates relevant entity.
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
    const eventData = event.data || event;

    // Look up campaign UUID
    const campaignInstantlyId = eventData.campaign_id || '';
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

    // Log event to instantly_events table (if it exists)
    try {
      await client.from('instantly_events').insert({
        user_id: userId,
        event_type: eventType,
        campaign_id: campaignUuid,
        lead_email: eventData.lead_email || eventData.email || eventData.lead || '',
        email_account: eventData.eaccount || eventData.from_address || eventData.email_account || '',
        data: JSON.stringify(eventData),
        timestamp: eventData.timestamp || new Date().toISOString()
      });
    } catch (e) {
      // Table may not exist yet — ignore silently
      console.error('Event log error (table may not exist):', e.message);
    }

    // Handle specific event types
    if (eventType === 'reply_received' || eventType === 'email.replied') {
      return await handleReplyReceived(client, userId, campaignUuid, eventData, res);
    }

    if (eventType === 'email_sent') {
      return await handleEmailSent(client, userId, campaignUuid, eventData, res);
    }

    if (eventType === 'email_opened') {
      // No specific entity update needed — event is logged above
      return res.status(200).json({ ok: true, action: 'logged', event_type: eventType });
    }

    if (eventType === 'link_clicked') {
      return res.status(200).json({ ok: true, action: 'logged', event_type: eventType });
    }

    if (eventType === 'email_bounced') {
      return res.status(200).json({ ok: true, action: 'logged', event_type: eventType });
    }

    // Lead interest events
    if (eventType.startsWith('lead_')) {
      const leadEmail = eventData.lead_email || eventData.email || '';
      if (leadEmail && campaignUuid) {
        // Map event type to interest status
        const statusMap = {
          'lead_interested': 'positive',
          'lead_not_interested': 'not_interested',
          'lead_meeting_booked': 'meeting_booked',
          'lead_meeting_completed': 'meeting_completed',
          'lead_closed': 'closed'
        };
        const newStatus = statusMap[eventType];
        if (newStatus) {
          await client.from('instantly_leads')
            .update({ interest_status: newStatus })
            .eq('user_id', userId)
            .eq('campaign_id', campaignUuid)
            .eq('email', leadEmail);
        }
      }
      return res.status(200).json({ ok: true, action: 'logged', event_type: eventType });
    }

    if (eventType === 'account_error') {
      const acctEmail = eventData.email || eventData.eaccount || '';
      if (acctEmail) {
        await client.from('instantly_accounts')
          .update({ status: 'error' })
          .eq('user_id', userId)
          .eq('email', acctEmail);
      }
      return res.status(200).json({ ok: true, action: 'logged', event_type: eventType });
    }

    // Unknown event type — acknowledge but skip
    return res.status(200).json({ ok: true, action: 'skipped', event_type: eventType });
  } catch (e) {
    console.error('Instantly webhook error:', e.message);
    return res.status(200).json({ ok: true, error: e.message });
  }
};

async function handleReplyReceived(client, userId, campaignUuid, emailData, res) {
  const emailId = emailData.id || emailData.email_id || emailData.uuid;
  if (!emailId) return res.status(200).json({ ok: true, action: 'skipped', reason: 'no email id' });

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
    is_unread: true,
    reply_status: 'pending',
    thread_id: emailData.thread_id || '',
    content_preview: (emailData.text_body || emailData.body || '').replace(/<[^>]*>/g, '').substring(0, 150),
    eaccount: emailData.eaccount || '',
    metadata: JSON.stringify({ source: 'webhook', event_type: 'reply_received' }),
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

async function handleEmailSent(client, userId, campaignUuid, emailData, res) {
  const emailId = emailData.id || emailData.email_id || emailData.uuid;
  if (!emailId) return res.status(200).json({ ok: true, action: 'skipped', reason: 'no email id' });

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
    is_reply: false,
    direction: 'outbound',
    thread_id: emailData.thread_id || '',
    eaccount: emailData.eaccount || '',
    metadata: JSON.stringify({ source: 'webhook', event_type: 'email_sent' }),
    synced_at: new Date().toISOString()
  };

  const { error } = await client
    .from('instantly_emails')
    .upsert(row, { onConflict: 'user_id,instantly_id' });

  if (error) {
    console.error('Webhook email_sent upsert error:', error.message);
  }

  return res.status(200).json({ ok: true, action: 'logged', event_type: 'email_sent' });
}
