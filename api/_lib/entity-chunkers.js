/**
 * Entity chunking functions for the TaskFlow knowledge base.
 *
 * Each function takes a database record (or record + related rows) and returns
 * an array of {title, content, metadata} objects — the same shape used by
 * chunkMeeting() and chunkEmailThread() in embeddings.js.
 *
 * Content is written as natural language so semantic search works well.
 */

var { chunkText } = require('./embeddings');

var MAX_CHUNK = 15000; // same limit as email chunks (~5000 tokens)


/* ═══════════ Tasks ═══════════ */

function chunkTask(task) {
  var dateStr = task.due ? new Date(task.due).toISOString().split('T')[0] : 'no due date';
  var parts = [];
  parts.push('Task: ' + task.item);
  if (task.status) parts.push('Status: ' + task.status);
  parts.push('Due: ' + dateStr);
  if (task.importance) parts.push('Importance: ' + task.importance);
  if (task.client) parts.push('Client: ' + task.client);
  if (task.end_client) parts.push('End Client: ' + task.end_client);
  if (task.campaign) parts.push('Campaign: ' + task.campaign);
  if (task.project) parts.push('Project: ' + task.project);
  if (task.phase) parts.push('Phase: ' + task.phase);
  if (task.opportunity) parts.push('Opportunity: ' + task.opportunity);
  if (task.category) parts.push('Category: ' + task.category);
  if (task.type && task.type !== 'Business') parts.push('Type: ' + task.type);
  if (task.est) parts.push('Estimated time: ' + task.est + ' minutes');
  if (task.duration) parts.push('Time spent: ' + task.duration + ' minutes');
  if (task.flag) parts.push('Flag: ' + task.flag);
  if (task.notes) parts.push('Notes: ' + task.notes);

  return [{
    title: 'Task: ' + (task.item || '').substring(0, 150),
    content: parts.join('\n'),
    metadata: {
      client_id: null,
      end_client: task.end_client || '',
      campaign_id: null,
      date: task.due || task.created_at || null,
      people: []
    }
  }];
}


function chunkCompletedTask(task) {
  var completedStr = task.completed ? new Date(task.completed).toISOString().split('T')[0] : '';
  var dueStr = task.due ? new Date(task.due).toISOString().split('T')[0] : '';
  var parts = [];
  parts.push('Completed Task: ' + task.item);
  if (completedStr) parts.push('Completed: ' + completedStr);
  if (dueStr) parts.push('Originally Due: ' + dueStr);
  if (task.importance) parts.push('Importance: ' + task.importance);
  if (task.client) parts.push('Client: ' + task.client);
  if (task.end_client) parts.push('End Client: ' + task.end_client);
  if (task.campaign) parts.push('Campaign: ' + task.campaign);
  if (task.project) parts.push('Project: ' + task.project);
  if (task.phase) parts.push('Phase: ' + task.phase);
  if (task.opportunity) parts.push('Opportunity: ' + task.opportunity);
  if (task.category) parts.push('Category: ' + task.category);
  if (task.type && task.type !== 'Business') parts.push('Type: ' + task.type);
  if (task.est) parts.push('Estimated time: ' + task.est + ' minutes');
  if (task.duration) parts.push('Time spent: ' + task.duration + ' minutes');
  if (task.notes) parts.push('Notes: ' + task.notes);

  return [{
    title: 'Done: ' + (task.item || '').substring(0, 150),
    content: parts.join('\n'),
    metadata: {
      client_id: null,
      end_client: task.end_client || '',
      campaign_id: null,
      date: task.completed || null,
      people: []
    }
  }];
}


/* ═══════════ Clients ═══════════ */

function chunkClient(client, notes) {
  var parts = [];
  parts.push('Client: ' + client.name);
  parts.push('Status: ' + (client.status || 'active'));
  if (client.company) parts.push('Company: ' + client.company);
  if (client.email) parts.push('Email: ' + client.email);
  if (client.notes) parts.push('Notes: ' + client.notes);

  if (notes && notes.length > 0) {
    parts.push('');
    parts.push('Client Notes:');
    notes.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });
    notes.forEach(function(n) {
      var d = n.created_at ? new Date(n.created_at).toISOString().split('T')[0] : '';
      parts.push('- ' + (d ? '[' + d + '] ' : '') + n.text);
    });
  }

  var content = parts.join('\n');
  if (content.length > MAX_CHUNK) {
    var chunks = chunkText(content, MAX_CHUNK, 200);
    return chunks.map(function(tc, i) {
      return {
        title: 'Client: ' + client.name + (chunks.length > 1 ? ' (Part ' + (i + 1) + ')' : ''),
        content: tc,
        metadata: {
          client_id: client.id, end_client: '', campaign_id: null,
          date: client.created_at || null, people: client.email ? [client.email] : []
        }
      };
    });
  }

  return [{
    title: 'Client: ' + client.name,
    content: content,
    metadata: {
      client_id: client.id, end_client: '', campaign_id: null,
      date: client.created_at || null, people: client.email ? [client.email] : []
    }
  }];
}


/* ═══════════ Campaigns ═══════════ */

function chunkCampaign(campaign, notes) {
  var parts = [];
  parts.push('Campaign: ' + campaign.name);
  parts.push('Status: ' + (campaign.status || 'Setup'));
  if (campaign.partner) parts.push('Partner/Client: ' + campaign.partner);
  if (campaign.end_client) parts.push('End Client: ' + campaign.end_client);
  if (campaign.platform) parts.push('Platform: ' + campaign.platform);
  if (campaign.goal) parts.push('Goal: ' + campaign.goal);

  var fees = [];
  if (campaign.strategy_fee > 0) fees.push('Strategy: $' + campaign.strategy_fee);
  if (campaign.setup_fee > 0) fees.push('Setup: $' + campaign.setup_fee);
  if (campaign.monthly_fee > 0) fees.push('Monthly: $' + campaign.monthly_fee);
  if (campaign.monthly_ad_spend > 0) fees.push('Ad Spend: $' + campaign.monthly_ad_spend + '/mo');
  if (fees.length) parts.push('Fees: ' + fees.join(', '));

  if (campaign.campaign_term) parts.push('Term: ' + campaign.campaign_term);
  if (campaign.billing_frequency) parts.push('Billing: ' + campaign.billing_frequency);
  if (campaign.planned_launch) parts.push('Planned Launch: ' + campaign.planned_launch);
  if (campaign.actual_launch) parts.push('Actual Launch: ' + campaign.actual_launch);
  if (campaign.renewal_date) parts.push('Renewal: ' + campaign.renewal_date);
  if (campaign.next_billing_date) parts.push('Next Billing: ' + campaign.next_billing_date);
  if (campaign.proposal_link) parts.push('Proposal: ' + campaign.proposal_link);
  if (campaign.reports_link) parts.push('Reports: ' + campaign.reports_link);
  if (campaign.notes) parts.push('Notes: ' + campaign.notes);

  if (notes && notes.length > 0) {
    parts.push('');
    parts.push('Campaign Notes:');
    notes.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });
    notes.forEach(function(n) {
      var d = n.created_at ? new Date(n.created_at).toISOString().split('T')[0] : '';
      parts.push('- ' + (d ? '[' + d + '] ' : '') + n.text);
    });
  }

  var content = parts.join('\n');
  if (content.length > MAX_CHUNK) {
    var chunks = chunkText(content, MAX_CHUNK, 200);
    return chunks.map(function(tc, i) {
      return {
        title: 'Campaign: ' + campaign.name + (chunks.length > 1 ? ' (Part ' + (i + 1) + ')' : ''),
        content: tc,
        metadata: {
          client_id: null, end_client: campaign.end_client || '',
          campaign_id: campaign.id, date: campaign.created_at || null, people: []
        }
      };
    });
  }

  return [{
    title: 'Campaign: ' + campaign.name,
    content: content,
    metadata: {
      client_id: null, end_client: campaign.end_client || '',
      campaign_id: campaign.id, date: campaign.created_at || null, people: []
    }
  }];
}


/* ═══════════ Contacts ═══════════ */

function chunkContact(contact) {
  var fullName = ((contact.first_name || '') + ' ' + (contact.last_name || '')).trim();
  var parts = [];
  parts.push('Contact: ' + (fullName || 'Unnamed'));
  if (contact.email) parts.push('Email: ' + contact.email);
  if (contact.phone) parts.push('Phone: ' + contact.phone);
  if (contact.role) parts.push('Role: ' + contact.role);
  if (contact.company) parts.push('Company: ' + contact.company);
  if (contact.website) parts.push('Website: ' + contact.website);
  if (contact.end_client) parts.push('End Client: ' + contact.end_client);
  if (contact.status) parts.push('Status: ' + contact.status);

  return [{
    title: 'Contact: ' + (fullName || contact.email || 'Unnamed'),
    content: parts.join('\n'),
    metadata: {
      client_id: contact.client_id || null, end_client: contact.end_client || '',
      campaign_id: null, date: contact.created_at || null,
      people: [fullName || contact.email || ''].filter(Boolean)
    }
  }];
}


/* ═══════════ Projects ═══════════ */

function chunkProject(project, phases) {
  var parts = [];
  parts.push('Project: ' + project.name);
  parts.push('Status: ' + (project.status || 'Planning'));
  if (project.description) parts.push('Description: ' + project.description);
  if (project.start_date) parts.push('Start: ' + project.start_date);
  if (project.target_date) parts.push('Target: ' + project.target_date);
  if (project.notes) parts.push('Notes: ' + project.notes);

  if (phases && phases.length > 0) {
    parts.push('');
    parts.push('Phases:');
    phases.sort(function(a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
    phases.forEach(function(p) {
      var line = '- ' + p.name + ' (' + (p.status || 'Not Started') + ')';
      if (p.description) line += ': ' + p.description;
      if (p.start_date || p.end_date) line += ' [' + (p.start_date || '?') + ' - ' + (p.end_date || '?') + ']';
      parts.push(line);
    });
  }

  var content = parts.join('\n');
  if (content.length > MAX_CHUNK) {
    var chunks = chunkText(content, MAX_CHUNK, 200);
    return chunks.map(function(tc, i) {
      return {
        title: 'Project: ' + project.name + (chunks.length > 1 ? ' (Part ' + (i + 1) + ')' : ''),
        content: tc,
        metadata: { client_id: null, end_client: '', campaign_id: null, date: project.created_at || null, people: [] }
      };
    });
  }

  return [{
    title: 'Project: ' + project.name,
    content: content,
    metadata: { client_id: null, end_client: '', campaign_id: null, date: project.created_at || null, people: [] }
  }];
}


/* ═══════════ Opportunities ═══════════ */

function chunkOpportunity(opp) {
  var parts = [];
  parts.push('Opportunity: ' + opp.name);
  parts.push('Stage: ' + (opp.stage || 'Lead'));
  if (opp.type) parts.push('Type: ' + opp.type);
  if (opp.client) parts.push('Client: ' + opp.client);
  if (opp.end_client) parts.push('End Client: ' + opp.end_client);
  if (opp.contact_name) parts.push('Contact: ' + opp.contact_name);
  if (opp.contact_email) parts.push('Contact Email: ' + opp.contact_email);
  if (opp.contact_job_title) parts.push('Job Title: ' + opp.contact_job_title);
  if (opp.prospect_website) parts.push('Website: ' + opp.prospect_website);
  if (opp.source) parts.push('Source: ' + opp.source);

  var fees = [];
  if (opp.strategy_fee > 0) fees.push('Strategy: $' + opp.strategy_fee);
  if (opp.setup_fee > 0) fees.push('Setup: $' + opp.setup_fee);
  if (opp.monthly_fee > 0) fees.push('Monthly: $' + opp.monthly_fee);
  if (opp.monthly_ad_spend > 0) fees.push('Ad Spend: $' + opp.monthly_ad_spend + '/mo');
  if (fees.length) parts.push('Fees: ' + fees.join(', '));

  if (opp.probability != null) parts.push('Probability: ' + opp.probability + '%');
  if (opp.expected_close) parts.push('Expected Close: ' + opp.expected_close);
  if (opp.payment_plan) parts.push('Payment Plan: ' + opp.payment_plan);
  if (opp.description) parts.push('Description: ' + opp.description);
  if (opp.company_description) parts.push('Company Description: ' + opp.company_description);
  if (opp.prospect_description) parts.push('Prospect Description: ' + opp.prospect_description);
  if (opp.previous_relationship) parts.push('Previous Relationship: ' + opp.previous_relationship);
  if (opp.video_strategy_benefits) parts.push('Video Strategy Benefits: ' + opp.video_strategy_benefits);
  if (opp.notes) parts.push('Notes: ' + opp.notes);
  if (opp.close_reason) parts.push('Close Reason: ' + opp.close_reason);

  var content = parts.join('\n');
  if (content.length > MAX_CHUNK) {
    var chunks = chunkText(content, MAX_CHUNK, 200);
    return chunks.map(function(tc, i) {
      return {
        title: 'Opportunity: ' + opp.name + (chunks.length > 1 ? ' (Part ' + (i + 1) + ')' : ''),
        content: tc,
        metadata: {
          client_id: null, end_client: opp.end_client || '', campaign_id: null,
          date: opp.expected_close || opp.created_at || null,
          people: opp.contact_name ? [opp.contact_name] : []
        }
      };
    });
  }

  return [{
    title: 'Opportunity: ' + opp.name,
    content: content,
    metadata: {
      client_id: null, end_client: opp.end_client || '', campaign_id: null,
      date: opp.expected_close || opp.created_at || null,
      people: opp.contact_name ? [opp.contact_name] : []
    }
  }];
}


/* ═══════════ Activity Logs ═══════════ */

function chunkActivityLogs(taskId, taskItem, logs) {
  if (!logs || logs.length === 0) return [];

  var parts = [];
  parts.push('Activity Log for Task: ' + (taskItem || taskId));
  parts.push('');
  logs.sort(function(a, b) { return new Date(b.ts) - new Date(a.ts); });
  logs.forEach(function(l) {
    var d = l.ts ? new Date(l.ts).toISOString().split('T')[0] : '';
    parts.push('[' + d + '] ' + l.text);
  });

  var content = parts.join('\n');
  if (content.length > MAX_CHUNK) {
    var chunks = chunkText(content, MAX_CHUNK, 200);
    return chunks.map(function(tc, i) {
      return {
        title: 'Activity: ' + (taskItem || taskId).substring(0, 120) + (chunks.length > 1 ? ' (Part ' + (i + 1) + ')' : ''),
        content: tc,
        metadata: { client_id: null, end_client: '', campaign_id: null, date: logs[0].ts || null, people: [] }
      };
    });
  }

  return [{
    title: 'Activity: ' + (taskItem || taskId).substring(0, 120),
    content: content,
    metadata: { client_id: null, end_client: '', campaign_id: null, date: logs[0].ts || null, people: [] }
  }];
}


/* ═══════════ Finance Payments ═══════════ */

function chunkFinancePayment(payment) {
  var dir = payment.direction === 'outflow' ? 'Expense' : 'Payment Received';
  var amt = Math.abs(payment.amount || 0).toFixed(2);
  var parts = [];
  parts.push(dir + ': ' + (payment.description || 'Unnamed'));
  if (payment.date) parts.push('Date: ' + payment.date);
  parts.push('Amount: $' + amt);
  if (payment.fee > 0) parts.push('Fee: $' + payment.fee.toFixed(2));
  if (payment.payer_name) parts.push('Payer: ' + payment.payer_name);
  if (payment.payer_email) parts.push('Payer Email: ' + payment.payer_email);
  if (payment.category) parts.push('Category: ' + payment.category);
  if (payment.end_client) parts.push('End Client: ' + payment.end_client);
  if (payment.source) parts.push('Source: ' + payment.source);
  if (payment.notes) parts.push('Notes: ' + payment.notes);

  return [{
    title: dir + ': ' + (payment.description || payment.payer_name || 'Unnamed') + ' ($' + amt + ')',
    content: parts.join('\n'),
    metadata: {
      client_id: payment.client_id || null, end_client: payment.end_client || '',
      campaign_id: payment.campaign_id || null, date: payment.date || null,
      people: payment.payer_name ? [payment.payer_name] : []
    }
  }];
}


/* ═══════════ Scheduled Items ═══════════ */

function chunkScheduledItem(item) {
  var dir = item.direction === 'outflow' ? 'Expense' : 'Income';
  var amt = Math.abs(item.amount || 0).toFixed(2);
  var parts = [];
  parts.push('Recurring ' + dir + ': ' + item.name);
  parts.push('Amount: $' + amt);
  parts.push('Frequency: ' + (item.frequency || 'monthly'));
  if (item.type) parts.push('Type: ' + item.type);
  if (item.category) parts.push('Category: ' + item.category);
  if (item.account) parts.push('Account: ' + item.account);
  if (item.next_due) parts.push('Next Due: ' + item.next_due);
  if (item.day_of_month) parts.push('Day of Month: ' + item.day_of_month);
  if (item.notes) parts.push('Notes: ' + item.notes);
  parts.push('Active: ' + (item.is_active ? 'Yes' : 'No'));

  return [{
    title: 'Recurring: ' + item.name + ' ($' + amt + '/' + (item.frequency || 'mo') + ')',
    content: parts.join('\n'),
    metadata: {
      client_id: item.client_id || null, end_client: '', campaign_id: null,
      date: item.next_due || null, people: []
    }
  }];
}


/* ═══════════ Team Members ═══════════ */

function chunkTeamMember(member) {
  var parts = [];
  parts.push('Team Member: ' + member.name);
  if (member.role) parts.push('Role: ' + member.role);
  if (member.salary > 0) parts.push('Salary: $' + member.salary + ' (' + (member.pay_frequency || 'monthly') + ')');
  if (member.commission_rate > 0) {
    var comm = 'Commission: ' + member.commission_rate + '%';
    if (member.commission_basis) comm += ' on ' + member.commission_basis;
    parts.push(comm);
  }
  if (member.start_date) parts.push('Start Date: ' + member.start_date);
  if (member.notes) parts.push('Notes: ' + member.notes);
  parts.push('Active: ' + (member.is_active ? 'Yes' : 'No'));

  return [{
    title: 'Team: ' + member.name + (member.role ? ' (' + member.role + ')' : ''),
    content: parts.join('\n'),
    metadata: {
      client_id: null, end_client: '', campaign_id: null,
      date: member.start_date || null, people: [member.name]
    }
  }];
}


/* ═══════════ Exports ═══════════ */

module.exports = {
  chunkTask: chunkTask,
  chunkCompletedTask: chunkCompletedTask,
  chunkClient: chunkClient,
  chunkCampaign: chunkCampaign,
  chunkContact: chunkContact,
  chunkProject: chunkProject,
  chunkOpportunity: chunkOpportunity,
  chunkActivityLogs: chunkActivityLogs,
  chunkFinancePayment: chunkFinancePayment,
  chunkScheduledItem: chunkScheduledItem,
  chunkTeamMember: chunkTeamMember
};
