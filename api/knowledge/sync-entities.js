/**
 * POST /api/knowledge/sync-entities
 * ====================================
 * Syncs one entity type into the knowledge base.
 * Called periodically by the frontend (every 90s, rotating through types).
 *
 * Body: { entityType: "task" | "task_done" | "client" | "campaign" |
 *         "contact" | "project" | "opportunity" | "activity_log" |
 *         "finance" | "scheduled_item" | "team_member" }
 *
 * Returns: { entityType, processed, embedded, skipped, deleted, tokens }
 */

var { getServiceClient, verifyUserToken, cors } = require('../_lib/supabase');
var { getOpenAIKey, embedTexts, contentHash, storeChunks, upsertSource, cleanOrphans } = require('../_lib/embeddings');
var chunkers = require('../_lib/entity-chunkers');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  var userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  var body = req.body || {};
  var entityType = body.entityType;

  var SYNC_MAP = {
    task: syncTasks,
    task_done: syncCompletedTasks,
    client: syncClients,
    campaign: syncCampaigns,
    contact: syncContacts,
    project: syncProjects,
    opportunity: syncOpportunities,
    activity_log: syncActivityLogs,
    finance: syncFinancePayments,
    scheduled_item: syncScheduledItems,
    team_member: syncTeamMembers
  };

  var syncFn = SYNC_MAP[entityType];
  if (!syncFn) return res.status(400).json({ error: 'Unknown entityType: ' + entityType });

  try {
    var client = getServiceClient();
    var openaiKey = await getOpenAIKey(userId);
    if (!openaiKey) return res.status(200).json({ error: 'No OpenAI key configured', entityType: entityType });

    var result = await syncFn(client, userId, openaiKey);
    return res.status(200).json(result);
  } catch (e) {
    console.error('sync-entities error [' + entityType + ']:', e.message);
    return res.status(200).json({ error: e.message, entityType: entityType });
  }
};


/* ─────────────────────────────────────────────
   Helper: embed only changed chunks for a source
   ───────────────────────────────────────────── */

async function embedSource(client, userId, openaiKey, sourceType, sourceId, chunks) {
  if (!chunks || chunks.length === 0) return { embedded: 0, skipped: 0, tokens: 0 };

  // Check existing hashes to skip unchanged content
  var existing = await client.from('knowledge_chunks')
    .select('chunk_index, content_hash')
    .eq('user_id', userId)
    .eq('source_type', sourceType)
    .eq('source_id', sourceId);

  var existingHashes = {};
  (existing.data || []).forEach(function(r) { existingHashes[r.chunk_index] = r.content_hash; });

  // Identify which chunks actually changed
  var changed = [];
  var changedIdx = [];
  var skipped = 0;

  for (var i = 0; i < chunks.length; i++) {
    var hash = contentHash(chunks[i].content);
    if (existingHashes[i] === hash) {
      skipped++;
    } else {
      changed.push(chunks[i]);
      changedIdx.push(i);
    }
  }

  // Also check if chunks were removed (fewer chunks now than before)
  var needsStore = changed.length > 0 || chunks.length !== Object.keys(existingHashes).length;
  if (!needsStore) return { embedded: 0, skipped: skipped, tokens: 0 };

  // Embed only the changed chunks
  var totalTokens = 0;
  if (changed.length > 0) {
    var texts = changed.map(function(c) { return c.content; });
    var embeddings = await embedTexts(openaiKey, texts);
    for (var j = 0; j < changed.length; j++) {
      changed[j].embedding = embeddings[j].embedding;
      changed[j].tokens = embeddings[j].tokens;
      totalTokens += embeddings[j].tokens;
    }
  }

  // For storeChunks, we need to pass ALL chunks (it handles index management).
  // Unchanged chunks need their existing embedding — storeChunks will skip them via hash.
  await storeChunks(client, userId, sourceType, sourceId, chunks);

  // Track source
  var title = chunks[0] ? chunks[0].title : '';
  await upsertSource(client, userId, sourceType, sourceId, title, 'complete', chunks.length, totalTokens, '');

  return { embedded: changed.length, skipped: skipped, tokens: totalTokens };
}


/* ─────────────────────────────────────────────
   Client name → UUID lookup (tasks use names)
   ───────────────────────────────────────────── */

async function buildClientMap(client, userId) {
  var res = await client.from('clients').select('id, name').eq('user_id', userId);
  var map = {};
  (res.data || []).forEach(function(c) { if (c.name) map[c.name] = c.id; });
  return map;
}


/* ═══════════════════════════════════════════
   Sync Functions — one per entity type
   ═══════════════════════════════════════════ */

async function syncTasks(client, userId, openaiKey) {
  var res = await client.from('tasks').select('*').eq('user_id', userId);
  var records = res.data || [];
  var clientMap = await buildClientMap(client, userId);

  var embedded = 0, skipped = 0, totalTokens = 0;
  var sourceIds = [];

  for (var i = 0; i < records.length; i++) {
    var task = records[i];
    sourceIds.push(task.id);
    var chunks = chunkers.chunkTask(task);
    chunks.forEach(function(c) { c.metadata.client_id = clientMap[task.client] || null; });
    var r = await embedSource(client, userId, openaiKey, 'task', task.id, chunks);
    embedded += r.embedded; skipped += r.skipped; totalTokens += r.tokens;
  }

  var deleted = await cleanOrphans(client, userId, 'task', sourceIds);
  return { entityType: 'task', processed: records.length, embedded: embedded, skipped: skipped, deleted: deleted, tokens: totalTokens };
}


async function syncCompletedTasks(client, userId, openaiKey) {
  // Only sync last 90 days of completed tasks
  var cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  var res = await client.from('done').select('*').eq('user_id', userId).gte('completed', cutoff);
  var records = res.data || [];
  var clientMap = await buildClientMap(client, userId);

  var embedded = 0, skipped = 0, totalTokens = 0;
  var sourceIds = [];

  for (var i = 0; i < records.length; i++) {
    var task = records[i];
    sourceIds.push(task.id);
    var chunks = chunkers.chunkCompletedTask(task);
    chunks.forEach(function(c) { c.metadata.client_id = clientMap[task.client] || null; });
    var r = await embedSource(client, userId, openaiKey, 'task_done', task.id, chunks);
    embedded += r.embedded; skipped += r.skipped; totalTokens += r.tokens;
  }

  var deleted = await cleanOrphans(client, userId, 'task_done', sourceIds);
  return { entityType: 'task_done', processed: records.length, embedded: embedded, skipped: skipped, deleted: deleted, tokens: totalTokens };
}


async function syncClients(client, userId, openaiKey) {
  var res = await client.from('clients').select('*').eq('user_id', userId);
  var records = res.data || [];

  // Fetch all client notes in one query
  var notesRes = await client.from('client_notes').select('*').eq('user_id', userId);
  var notesByClient = {};
  (notesRes.data || []).forEach(function(n) {
    if (!notesByClient[n.client_id]) notesByClient[n.client_id] = [];
    notesByClient[n.client_id].push(n);
  });

  var embedded = 0, skipped = 0, totalTokens = 0;
  var sourceIds = [];

  for (var i = 0; i < records.length; i++) {
    var c = records[i];
    sourceIds.push(c.id);
    var notes = notesByClient[c.id] || [];
    var chunks = chunkers.chunkClient(c, notes);
    var r = await embedSource(client, userId, openaiKey, 'client', c.id, chunks);
    embedded += r.embedded; skipped += r.skipped; totalTokens += r.tokens;
  }

  var deleted = await cleanOrphans(client, userId, 'client', sourceIds);
  return { entityType: 'client', processed: records.length, embedded: embedded, skipped: skipped, deleted: deleted, tokens: totalTokens };
}


async function syncCampaigns(client, userId, openaiKey) {
  var res = await client.from('campaigns').select('*').eq('user_id', userId);
  var records = res.data || [];

  var notesRes = await client.from('campaign_notes').select('*').eq('user_id', userId);
  var notesByCampaign = {};
  (notesRes.data || []).forEach(function(n) {
    if (!notesByCampaign[n.campaign_id]) notesByCampaign[n.campaign_id] = [];
    notesByCampaign[n.campaign_id].push(n);
  });

  // Build client name map for partner field
  var clientMap = await buildClientMap(client, userId);

  var embedded = 0, skipped = 0, totalTokens = 0;
  var sourceIds = [];

  for (var i = 0; i < records.length; i++) {
    var camp = records[i];
    sourceIds.push(camp.id);
    var notes = notesByCampaign[camp.id] || [];
    var chunks = chunkers.chunkCampaign(camp, notes);
    // Resolve client_id from partner name
    chunks.forEach(function(c) { c.metadata.client_id = clientMap[camp.partner] || null; });
    var r = await embedSource(client, userId, openaiKey, 'campaign', camp.id, chunks);
    embedded += r.embedded; skipped += r.skipped; totalTokens += r.tokens;
  }

  var deleted = await cleanOrphans(client, userId, 'campaign', sourceIds);
  return { entityType: 'campaign', processed: records.length, embedded: embedded, skipped: skipped, deleted: deleted, tokens: totalTokens };
}


async function syncContacts(client, userId, openaiKey) {
  var res = await client.from('contacts').select('*').eq('user_id', userId);
  var records = res.data || [];

  var embedded = 0, skipped = 0, totalTokens = 0;
  var sourceIds = [];

  for (var i = 0; i < records.length; i++) {
    var contact = records[i];
    sourceIds.push(contact.id);
    var chunks = chunkers.chunkContact(contact);
    var r = await embedSource(client, userId, openaiKey, 'contact', contact.id, chunks);
    embedded += r.embedded; skipped += r.skipped; totalTokens += r.tokens;
  }

  var deleted = await cleanOrphans(client, userId, 'contact', sourceIds);
  return { entityType: 'contact', processed: records.length, embedded: embedded, skipped: skipped, deleted: deleted, tokens: totalTokens };
}


async function syncProjects(client, userId, openaiKey) {
  var res = await client.from('projects').select('*').eq('user_id', userId);
  var records = res.data || [];

  var phasesRes = await client.from('project_phases').select('*').eq('user_id', userId);
  var phasesByProject = {};
  (phasesRes.data || []).forEach(function(p) {
    if (!phasesByProject[p.project_id]) phasesByProject[p.project_id] = [];
    phasesByProject[p.project_id].push(p);
  });

  var embedded = 0, skipped = 0, totalTokens = 0;
  var sourceIds = [];

  for (var i = 0; i < records.length; i++) {
    var proj = records[i];
    sourceIds.push(proj.id);
    var phases = phasesByProject[proj.id] || [];
    var chunks = chunkers.chunkProject(proj, phases);
    var r = await embedSource(client, userId, openaiKey, 'project', proj.id, chunks);
    embedded += r.embedded; skipped += r.skipped; totalTokens += r.tokens;
  }

  var deleted = await cleanOrphans(client, userId, 'project', sourceIds);
  return { entityType: 'project', processed: records.length, embedded: embedded, skipped: skipped, deleted: deleted, tokens: totalTokens };
}


async function syncOpportunities(client, userId, openaiKey) {
  var res = await client.from('opportunities').select('*').eq('user_id', userId);
  var records = res.data || [];
  var clientMap = await buildClientMap(client, userId);

  var embedded = 0, skipped = 0, totalTokens = 0;
  var sourceIds = [];

  for (var i = 0; i < records.length; i++) {
    var opp = records[i];
    sourceIds.push(opp.id);
    var chunks = chunkers.chunkOpportunity(opp);
    chunks.forEach(function(c) { c.metadata.client_id = clientMap[opp.client] || null; });
    var r = await embedSource(client, userId, openaiKey, 'opportunity', opp.id, chunks);
    embedded += r.embedded; skipped += r.skipped; totalTokens += r.tokens;
  }

  var deleted = await cleanOrphans(client, userId, 'opportunity', sourceIds);
  return { entityType: 'opportunity', processed: records.length, embedded: embedded, skipped: skipped, deleted: deleted, tokens: totalTokens };
}


async function syncActivityLogs(client, userId, openaiKey) {
  // Group activity logs by task_id
  var res = await client.from('activity_logs').select('*').eq('user_id', userId);
  var allLogs = res.data || [];

  // Get task names for context
  var tasksRes = await client.from('tasks').select('id, item').eq('user_id', userId);
  var taskNames = {};
  (tasksRes.data || []).forEach(function(t) { taskNames[t.id] = t.item; });

  // Group logs by task_id
  var logsByTask = {};
  allLogs.forEach(function(l) {
    if (!l.task_id) return;
    if (!logsByTask[l.task_id]) logsByTask[l.task_id] = [];
    logsByTask[l.task_id].push(l);
  });

  var embedded = 0, skipped = 0, totalTokens = 0;
  var sourceIds = [];
  var taskIds = Object.keys(logsByTask);

  for (var i = 0; i < taskIds.length; i++) {
    var taskId = taskIds[i];
    var logs = logsByTask[taskId];
    sourceIds.push(taskId);
    var taskItem = taskNames[taskId] || taskId;
    var chunks = chunkers.chunkActivityLogs(taskId, taskItem, logs);
    if (chunks.length === 0) continue;
    var r = await embedSource(client, userId, openaiKey, 'activity_log', taskId, chunks);
    embedded += r.embedded; skipped += r.skipped; totalTokens += r.tokens;
  }

  var deleted = await cleanOrphans(client, userId, 'activity_log', sourceIds);
  return { entityType: 'activity_log', processed: taskIds.length, embedded: embedded, skipped: skipped, deleted: deleted, tokens: totalTokens };
}


async function syncFinancePayments(client, userId, openaiKey) {
  // Only sync payments with descriptions or payer info (skip empty ones)
  var res = await client.from('finance_payments').select('*').eq('user_id', userId);
  var records = (res.data || []).filter(function(p) {
    return p.description || p.payer_name || p.payer_email || p.notes;
  });

  var embedded = 0, skipped = 0, totalTokens = 0;
  var sourceIds = [];

  for (var i = 0; i < records.length; i++) {
    var payment = records[i];
    sourceIds.push(payment.id);
    var chunks = chunkers.chunkFinancePayment(payment);
    var r = await embedSource(client, userId, openaiKey, 'finance', payment.id, chunks);
    embedded += r.embedded; skipped += r.skipped; totalTokens += r.tokens;
  }

  var deleted = await cleanOrphans(client, userId, 'finance', sourceIds);
  return { entityType: 'finance', processed: records.length, embedded: embedded, skipped: skipped, deleted: deleted, tokens: totalTokens };
}


async function syncScheduledItems(client, userId, openaiKey) {
  var res = await client.from('scheduled_items').select('*').eq('user_id', userId);
  var records = res.data || [];

  var embedded = 0, skipped = 0, totalTokens = 0;
  var sourceIds = [];

  for (var i = 0; i < records.length; i++) {
    var item = records[i];
    sourceIds.push(item.id);
    var chunks = chunkers.chunkScheduledItem(item);
    var r = await embedSource(client, userId, openaiKey, 'scheduled_item', item.id, chunks);
    embedded += r.embedded; skipped += r.skipped; totalTokens += r.tokens;
  }

  var deleted = await cleanOrphans(client, userId, 'scheduled_item', sourceIds);
  return { entityType: 'scheduled_item', processed: records.length, embedded: embedded, skipped: skipped, deleted: deleted, tokens: totalTokens };
}


async function syncTeamMembers(client, userId, openaiKey) {
  var res = await client.from('team_members').select('*').eq('user_id', userId);
  var records = res.data || [];

  var embedded = 0, skipped = 0, totalTokens = 0;
  var sourceIds = [];

  for (var i = 0; i < records.length; i++) {
    var member = records[i];
    sourceIds.push(member.id);
    var chunks = chunkers.chunkTeamMember(member);
    var r = await embedSource(client, userId, openaiKey, 'team_member', member.id, chunks);
    embedded += r.embedded; skipped += r.skipped; totalTokens += r.tokens;
  }

  var deleted = await cleanOrphans(client, userId, 'team_member', sourceIds);
  return { entityType: 'team_member', processed: records.length, embedded: embedded, skipped: skipped, deleted: deleted, tokens: totalTokens };
}
