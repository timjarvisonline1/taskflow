/**
 * POST /api/knowledge/sync-entities
 * ====================================
 * Syncs one entity type into the knowledge base.
 * Called periodically by the frontend (every 90s, rotating through types).
 *
 * Uses batch processing:
 *   1. Pre-fetch ALL existing hashes for the source_type in one query
 *   2. Compare in memory to find changed records
 *   3. Embed ALL changed chunks in one batch API call
 *   4. Store individually (fast DB writes)
 *   5. Clean up orphans (deleted records)
 *
 * Body: { entityType: "task" | "task_done" | "client" | "campaign" |
 *         "contact" | "project" | "opportunity" | "activity_log" |
 *         "finance" | "scheduled_item" | "team_member" }
 *
 * Returns: { entityType, processed, embedded, skipped, deleted, tokens }
 */

var { getServiceClient, verifyUserToken, cors } = require('../_lib/supabase');
var { getOpenAIKey, embedTexts, contentHash, storeChunks, upsertSource, cleanOrphans, EMBED_MODEL } = require('../_lib/embeddings');
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
   Batch processing: pre-fetch hashes, batch embed, store
   ───────────────────────────────────────────── */

/**
 * Fetches ALL existing chunk hashes for a source_type in one query.
 * Returns: { sourceId: { chunkIndex: { hash, id } } }
 */
async function fetchAllHashes(client, userId, sourceType) {
  var allRows = [];
  var offset = 0;
  while (true) {
    var page = await client.from('knowledge_chunks')
      .select('source_id, chunk_index, content_hash, id')
      .eq('user_id', userId)
      .eq('source_type', sourceType)
      .range(offset, offset + 999);
    var rows = page.data || [];
    allRows = allRows.concat(rows);
    if (rows.length < 1000) break;
    offset += 1000;
  }

  var lookup = {};
  allRows.forEach(function(r) {
    if (!lookup[r.source_id]) lookup[r.source_id] = {};
    lookup[r.source_id][r.chunk_index] = { hash: r.content_hash, id: r.id };
  });
  return lookup;
}

/**
 * Batch-process an array of entity chunks:
 * entityChunks = [{ sourceId: uuid, chunks: [{title, content, metadata}] }]
 *
 * 1. Pre-fetches all hashes (1 query)
 * 2. Compares in memory
 * 3. Embeds all changed chunks (1 API call)
 * 4. Stores each changed chunk
 * 5. Cleans orphans
 */
async function batchProcess(client, userId, openaiKey, sourceType, entityChunks) {
  // 1. Pre-fetch all existing hashes for this source_type
  var hashLookup = await fetchAllHashes(client, userId, sourceType);

  // 2. Find changed chunks
  var toEmbed = [];   // { sourceId, chunkIdx, chunk, hash, existingId }
  var skipped = 0;

  for (var i = 0; i < entityChunks.length; i++) {
    var entity = entityChunks[i];
    var existingEntity = hashLookup[entity.sourceId] || {};

    for (var j = 0; j < entity.chunks.length; j++) {
      var chunk = entity.chunks[j];
      var hash = contentHash(chunk.content);
      var existing = existingEntity[j];

      if (existing && existing.hash === hash) {
        skipped++;
        continue;
      }

      toEmbed.push({
        sourceId: entity.sourceId,
        chunkIdx: j,
        chunk: chunk,
        hash: hash,
        existingId: existing ? existing.id : null
      });
    }
  }

  // 3. Batch embed all changed chunks in one API call
  var totalTokens = 0;
  if (toEmbed.length > 0) {
    var texts = toEmbed.map(function(e) { return e.chunk.content; });
    var embeddings = await embedTexts(openaiKey, texts);
    for (var k = 0; k < toEmbed.length; k++) {
      toEmbed[k].embedding = embeddings[k].embedding;
      toEmbed[k].tokens = embeddings[k].tokens;
      totalTokens += embeddings[k].tokens;
    }
  }

  // 4. Store changed chunks (batch inserts, individual updates)
  var inserts = [];
  var updates = [];

  for (var m = 0; m < toEmbed.length; m++) {
    var e = toEmbed[m];
    var meta = e.chunk.metadata || {};

    var row = {
      user_id: userId,
      source_type: sourceType,
      source_id: e.sourceId,
      chunk_index: e.chunkIdx,
      title: e.chunk.title || '',
      content: e.chunk.content,
      client_id: meta.client_id || null,
      end_client: meta.end_client || '',
      campaign_id: meta.campaign_id || null,
      date: meta.date || null,
      people: meta.people || [],
      tags: meta.tags || [],
      embedding: '[' + e.embedding.join(',') + ']',
      embedding_model: EMBED_MODEL,
      token_count: e.tokens || 0,
      content_hash: e.hash,
      updated_at: new Date().toISOString()
    };

    if (e.existingId) {
      updates.push({ id: e.existingId, row: row });
    } else {
      inserts.push(row);
    }
  }

  // Batch insert new chunks (50 at a time — embeddings are large)
  for (var bi = 0; bi < inserts.length; bi += 50) {
    var batch = inserts.slice(bi, bi + 50);
    await client.from('knowledge_chunks').insert(batch);
  }

  // Update existing chunks individually (usually few during normal syncs)
  for (var u = 0; u < updates.length; u++) {
    await client.from('knowledge_chunks')
      .update(updates[u].row)
      .eq('id', updates[u].id);
  }

  // 5. Batch upsert source tracking
  // Build set of changed sourceIds for quick lookup
  var changedSourceIds = {};
  toEmbed.forEach(function(te) { changedSourceIds[te.sourceId] = true; });

  // Fetch existing source tracking rows in one query
  var existingSources = await client.from('knowledge_sources')
    .select('source_id')
    .eq('user_id', userId)
    .eq('source_type', sourceType);
  var existingSourceSet = {};
  (existingSources.data || []).forEach(function(s) { existingSourceSet[s.source_id] = true; });

  // Build rows to insert (new) and update (changed)
  var sourceInserts = [];
  var sourceUpdates = [];
  var now = new Date().toISOString();

  for (var si = 0; si < entityChunks.length; si++) {
    var ent = entityChunks[si];
    var title = ent.chunks[0] ? ent.chunks[0].title : '';
    var isNew = !existingSourceSet[ent.sourceId];
    var hasChanges = !!changedSourceIds[ent.sourceId];

    if (isNew) {
      sourceInserts.push({
        user_id: userId,
        source_type: sourceType,
        source_id: ent.sourceId,
        name: title,
        status: 'complete',
        chunks_count: ent.chunks.length,
        tokens_used: 0,
        error_message: '',
        last_ingested_at: now
      });
    } else if (hasChanges) {
      sourceUpdates.push(ent.sourceId);
    }
  }

  // Batch insert new source rows (100 at a time)
  for (var sbi = 0; sbi < sourceInserts.length; sbi += 100) {
    var srcBatch = sourceInserts.slice(sbi, sbi + 100);
    await client.from('knowledge_sources').insert(srcBatch);
  }

  // Update changed sources (usually few during normal syncs)
  for (var su = 0; su < sourceUpdates.length; su++) {
    await client.from('knowledge_sources')
      .update({ last_ingested_at: now, status: 'complete' })
      .eq('user_id', userId)
      .eq('source_type', sourceType)
      .eq('source_id', sourceUpdates[su]);
  }

  // 6. Clean orphans
  var validIds = entityChunks.map(function(e) { return e.sourceId; });
  var deleted = await cleanOrphans(client, userId, sourceType, validIds);

  return {
    entityType: sourceType,
    processed: entityChunks.length,
    embedded: toEmbed.length,
    skipped: skipped,
    deleted: deleted,
    tokens: totalTokens
  };
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

  var entityChunks = [];
  for (var i = 0; i < records.length; i++) {
    var task = records[i];
    var chunks = chunkers.chunkTask(task);
    chunks.forEach(function(c) { c.metadata.client_id = clientMap[task.client] || null; });
    entityChunks.push({ sourceId: task.id, chunks: chunks });
  }

  return batchProcess(client, userId, openaiKey, 'task', entityChunks);
}


async function syncCompletedTasks(client, userId, openaiKey) {
  // Only sync last 90 days of completed tasks
  var cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  var res = await client.from('done').select('*').eq('user_id', userId).gte('completed', cutoff);
  var records = res.data || [];
  var clientMap = await buildClientMap(client, userId);

  var entityChunks = [];
  for (var i = 0; i < records.length; i++) {
    var task = records[i];
    var chunks = chunkers.chunkCompletedTask(task);
    chunks.forEach(function(c) { c.metadata.client_id = clientMap[task.client] || null; });
    entityChunks.push({ sourceId: task.id, chunks: chunks });
  }

  return batchProcess(client, userId, openaiKey, 'task_done', entityChunks);
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

  var entityChunks = [];
  for (var i = 0; i < records.length; i++) {
    var c = records[i];
    var notes = notesByClient[c.id] || [];
    var chunks = chunkers.chunkClient(c, notes);
    entityChunks.push({ sourceId: c.id, chunks: chunks });
  }

  return batchProcess(client, userId, openaiKey, 'client', entityChunks);
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

  var clientMap = await buildClientMap(client, userId);

  var entityChunks = [];
  for (var i = 0; i < records.length; i++) {
    var camp = records[i];
    var notes = notesByCampaign[camp.id] || [];
    var chunks = chunkers.chunkCampaign(camp, notes);
    chunks.forEach(function(c) { c.metadata.client_id = clientMap[camp.partner] || null; });
    entityChunks.push({ sourceId: camp.id, chunks: chunks });
  }

  return batchProcess(client, userId, openaiKey, 'campaign', entityChunks);
}


async function syncContacts(client, userId, openaiKey) {
  var res = await client.from('contacts').select('*').eq('user_id', userId);
  var records = res.data || [];

  var entityChunks = [];
  for (var i = 0; i < records.length; i++) {
    var contact = records[i];
    var chunks = chunkers.chunkContact(contact);
    entityChunks.push({ sourceId: contact.id, chunks: chunks });
  }

  return batchProcess(client, userId, openaiKey, 'contact', entityChunks);
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

  var entityChunks = [];
  for (var i = 0; i < records.length; i++) {
    var proj = records[i];
    var phases = phasesByProject[proj.id] || [];
    var chunks = chunkers.chunkProject(proj, phases);
    entityChunks.push({ sourceId: proj.id, chunks: chunks });
  }

  return batchProcess(client, userId, openaiKey, 'project', entityChunks);
}


async function syncOpportunities(client, userId, openaiKey) {
  var res = await client.from('opportunities').select('*').eq('user_id', userId);
  var records = res.data || [];
  var clientMap = await buildClientMap(client, userId);

  var entityChunks = [];
  for (var i = 0; i < records.length; i++) {
    var opp = records[i];
    var chunks = chunkers.chunkOpportunity(opp);
    chunks.forEach(function(c) { c.metadata.client_id = clientMap[opp.client] || null; });
    entityChunks.push({ sourceId: opp.id, chunks: chunks });
  }

  return batchProcess(client, userId, openaiKey, 'opportunity', entityChunks);
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

  var entityChunks = [];
  var taskIds = Object.keys(logsByTask);

  for (var i = 0; i < taskIds.length; i++) {
    var taskId = taskIds[i];
    var logs = logsByTask[taskId];
    var taskItem = taskNames[taskId] || taskId;
    var chunks = chunkers.chunkActivityLogs(taskId, taskItem, logs);
    if (chunks.length === 0) continue;
    entityChunks.push({ sourceId: taskId, chunks: chunks });
  }

  return batchProcess(client, userId, openaiKey, 'activity_log', entityChunks);
}


async function syncFinancePayments(client, userId, openaiKey) {
  var res = await client.from('finance_payments').select('*').eq('user_id', userId);
  var records = (res.data || []).filter(function(p) {
    return p.description || p.payer_name || p.payer_email || p.notes;
  });

  var entityChunks = [];
  for (var i = 0; i < records.length; i++) {
    var payment = records[i];
    var chunks = chunkers.chunkFinancePayment(payment);
    entityChunks.push({ sourceId: payment.id, chunks: chunks });
  }

  return batchProcess(client, userId, openaiKey, 'finance', entityChunks);
}


async function syncScheduledItems(client, userId, openaiKey) {
  var res = await client.from('scheduled_items').select('*').eq('user_id', userId);
  var records = res.data || [];

  var entityChunks = [];
  for (var i = 0; i < records.length; i++) {
    var item = records[i];
    var chunks = chunkers.chunkScheduledItem(item);
    entityChunks.push({ sourceId: item.id, chunks: chunks });
  }

  return batchProcess(client, userId, openaiKey, 'scheduled_item', entityChunks);
}


async function syncTeamMembers(client, userId, openaiKey) {
  var res = await client.from('team_members').select('*').eq('user_id', userId);
  var records = res.data || [];

  var entityChunks = [];
  for (var i = 0; i < records.length; i++) {
    var member = records[i];
    var chunks = chunkers.chunkTeamMember(member);
    entityChunks.push({ sourceId: member.id, chunks: chunks });
  }

  return batchProcess(client, userId, openaiKey, 'team_member', entityChunks);
}
