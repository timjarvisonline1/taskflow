/**
 * TaskFlow Knowledge Base: Core embedding library
 * =================================================
 * Shared functions for chunking content, generating embeddings,
 * storing/searching vectors, and deduplication.
 *
 * Embedding model: OpenAI text-embedding-3-small (1536 dimensions)
 */

const crypto = require('crypto');
const { getServiceClient, getCredentials } = require('./supabase');

const OPENAI_EMBED_URL = 'https://api.openai.com/v1/embeddings';
const EMBED_MODEL = 'text-embedding-3-small';
const EMBED_DIMS = 1536;
const MAX_BATCH_SIZE = 2048;   // OpenAI batch limit
const CHUNK_SIZE = 2000;       // chars per chunk (default)
const CHUNK_OVERLAP = 200;     // overlap between chunks

/* ═══════════ API Key ═══════════ */

async function getOpenAIKey(userId) {
  var cred = await getCredentials(userId, 'openai');
  if (!cred || !cred.credentials || !cred.credentials.api_key) return null;
  return cred.credentials.api_key;
}

/* ═══════════ Embedding ═══════════ */

/**
 * Embed an array of text strings via OpenAI.
 * Returns array of {embedding: Float32Array, tokens: number} in same order.
 * Automatically batches if more than MAX_BATCH_SIZE inputs.
 */
async function embedTexts(apiKey, texts) {
  if (!texts || texts.length === 0) return [];

  var results = new Array(texts.length);
  var totalTokens = 0;

  // Process in batches
  for (var i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    var batch = texts.slice(i, i + MAX_BATCH_SIZE);

    var resp = await fetch(OPENAI_EMBED_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: EMBED_MODEL,
        input: batch
      })
    });

    if (!resp.ok) {
      var errText = await resp.text();
      throw new Error('OpenAI embedding error (' + resp.status + '): ' + errText.substring(0, 200));
    }

    var data = await resp.json();
    totalTokens += (data.usage && data.usage.total_tokens) || 0;

    for (var j = 0; j < data.data.length; j++) {
      results[i + j] = {
        embedding: data.data[j].embedding,
        tokens: 0 // per-item tokens not available; total tracked separately
      };
    }
  }

  // Distribute total tokens evenly (approximation)
  var perItem = Math.ceil(totalTokens / texts.length);
  for (var k = 0; k < results.length; k++) {
    if (results[k]) results[k].tokens = perItem;
  }

  return results;
}

/* ═══════════ Chunking ═══════════ */

/**
 * Split text into overlapping windows.
 * Tries to break at sentence/paragraph boundaries.
 */
function chunkText(text, maxChars, overlap) {
  if (!text) return [];
  maxChars = maxChars || CHUNK_SIZE;
  overlap = overlap || CHUNK_OVERLAP;

  // Short text = single chunk
  if (text.length <= maxChars) return [text];

  var chunks = [];
  var pos = 0;

  while (pos < text.length) {
    var end = Math.min(pos + maxChars, text.length);

    // Try to break at paragraph, then sentence, then word boundary
    if (end < text.length) {
      var breakAt = -1;
      // Look for paragraph break in last 30% of chunk
      var searchStart = pos + Math.floor(maxChars * 0.7);
      var sub = text.substring(searchStart, end);

      var paraBreak = sub.lastIndexOf('\n\n');
      if (paraBreak !== -1) {
        breakAt = searchStart + paraBreak + 2;
      } else {
        // Sentence break (. or ? or ! followed by space/newline)
        var sentenceMatch = sub.match(/[.!?]\s(?=[A-Z])/g);
        if (sentenceMatch) {
          var lastSentence = sub.lastIndexOf(sentenceMatch[sentenceMatch.length - 1]);
          if (lastSentence !== -1) breakAt = searchStart + lastSentence + 2;
        }
      }
      if (breakAt === -1) {
        // Word boundary
        var lastSpace = text.lastIndexOf(' ', end);
        if (lastSpace > pos) breakAt = lastSpace + 1;
      }
      if (breakAt > pos) end = breakAt;
    }

    chunks.push(text.substring(pos, end).trim());

    // Advance with overlap
    pos = end - overlap;
    if (pos >= text.length) break;
    // Don't create tiny trailing chunks
    if (text.length - pos < overlap) {
      // Append remainder to last chunk if small
      if (chunks.length > 0 && text.length - pos < maxChars * 0.3) {
        chunks[chunks.length - 1] += '\n' + text.substring(pos).trim();
      } else {
        chunks.push(text.substring(pos).trim());
      }
      break;
    }
  }

  return chunks.filter(function(c) { return c.length > 0; });
}


/**
 * Chunk a meeting record into embeddable pieces.
 * Returns array of {title, content, metadata} objects.
 */
function chunkMeeting(meeting) {
  var chunks = [];
  var baseTitle = meeting.title || 'Untitled Meeting';
  var dateStr = meeting.start_time ? new Date(meeting.start_time).toISOString().split('T')[0] : '';
  var people = [];
  if (Array.isArray(meeting.participants)) {
    people = meeting.participants.map(function(p) { return p.name || p.email || ''; }).filter(Boolean);
  }

  var metadata = {
    client_id: meeting.client_id || null,
    end_client: meeting.end_client || '',
    end_client_id: meeting.end_client_id || null,
    campaign_id: meeting.campaign_id || null,
    date: meeting.start_time || null,
    people: people
  };

  // Summary chunk (always separate)
  if (meeting.summary) {
    chunks.push({
      title: baseTitle + ' - Summary' + (dateStr ? ' (' + dateStr + ')' : ''),
      content: meeting.summary,
      metadata: metadata
    });
  }

  // Chapter summaries (if available, these are high-quality chunks)
  if (Array.isArray(meeting.chapter_summaries) && meeting.chapter_summaries.length > 0) {
    meeting.chapter_summaries.forEach(function(ch, idx) {
      var chContent = '';
      if (ch.title) chContent += ch.title + '\n\n';
      if (ch.description) chContent += ch.description;
      if (ch.topics) chContent += '\n\nTopics: ' + ch.topics;
      if (chContent.trim()) {
        chunks.push({
          title: baseTitle + ' - ' + (ch.title || 'Chapter ' + (idx + 1)) + (dateStr ? ' (' + dateStr + ')' : ''),
          content: chContent.trim(),
          metadata: metadata
        });
      }
    });
  }

  // Transcript chunks (split into windows)
  if (meeting.transcript) {
    var transcriptChunks = chunkText(meeting.transcript, 2000, 200);
    transcriptChunks.forEach(function(tc, idx) {
      chunks.push({
        title: baseTitle + ' - Transcript part ' + (idx + 1) + (dateStr ? ' (' + dateStr + ')' : ''),
        content: tc,
        metadata: metadata
      });
    });
  }

  // Action items (if any, combine into one chunk)
  if (Array.isArray(meeting.action_items) && meeting.action_items.length > 0) {
    var aiText = meeting.action_items.map(function(a) {
      return '- ' + (a.text || a.description || '');
    }).filter(function(l) { return l.length > 2; }).join('\n');
    if (aiText) {
      chunks.push({
        title: baseTitle + ' - Action Items' + (dateStr ? ' (' + dateStr + ')' : ''),
        content: aiText,
        metadata: metadata
      });
    }
  }

  return chunks;
}


/**
 * Chunk an email thread into embeddable pieces.
 * Each message = one or more chunks. Long messages are split into sub-chunks
 * to stay within the embedding model's 8192 token limit (~28,000 chars).
 * messages: [{from, fromName, date, body, subject}]
 */
function chunkEmailThread(threadId, subject, messages, crmMetadata) {
  if (!messages || messages.length === 0) return [];

  // ~5000 tokens = ~15,000 chars — conservative for URL-heavy content
  var MAX_BODY_CHARS = 15000;
  var results = [];

  messages.forEach(function(msg) {
    var fromLabel = msg.fromName || msg.from || 'Unknown';
    var dateStr = msg.date ? new Date(msg.date).toISOString().split('T')[0] : '';
    var body = (msg.body || '');
    if (!body.trim()) return;

    var header = 'From: ' + fromLabel + '\nDate: ' + (dateStr || 'unknown') + '\nSubject: ' + (subject || '') + '\n\n';
    var baseTitle = (subject || 'Email') + ' - ' + fromLabel + (dateStr ? ' (' + dateStr + ')' : '');
    var meta = {
      client_id: (crmMetadata && crmMetadata.client_id) || null,
      end_client: (crmMetadata && crmMetadata.end_client) || '',
      end_client_id: (crmMetadata && crmMetadata.end_client_id) || null,
      campaign_id: (crmMetadata && crmMetadata.campaign_id) || null,
      date: msg.date || null,
      people: [fromLabel]
    };

    if (body.length <= MAX_BODY_CHARS) {
      // Single chunk
      results.push({ title: baseTitle, content: header + body, metadata: meta });
    } else {
      // Split long body into sub-chunks
      var bodyChunks = chunkText(body, MAX_BODY_CHARS, 200);
      bodyChunks.forEach(function(bc, ci) {
        results.push({
          title: baseTitle + (bodyChunks.length > 1 ? ' (Part ' + (ci + 1) + ')' : ''),
          content: header + bc,
          metadata: meta
        });
      });
    }
  });

  return results;
}


/**
 * Chunk a web page into embeddable pieces.
 * text: plain text content, title: page title
 */
function chunkWebPage(text, title, url) {
  if (!text) return [];

  var pageChunks = chunkText(text, 1500, 150);
  return pageChunks.map(function(tc, idx) {
    return {
      title: (title || 'Web Page') + ' - Part ' + (idx + 1),
      content: tc,
      metadata: {
        client_id: null,
        end_client: '',
        end_client_id: null,
        campaign_id: null,
        date: new Date().toISOString(),
        people: [],
        url: url || ''
      }
    };
  });
}


/* ═══════════ Hashing / Dedup ═══════════ */

function contentHash(text) {
  return crypto.createHash('sha256').update(text || '').digest('hex');
}


/* ═══════════ Storage ═══════════ */

/**
 * Store chunks with embeddings into knowledge_chunks table.
 * Handles deduplication via content_hash.
 *
 * chunks: array of {title, content, metadata, embedding, tokens}
 * sourceType: 'meeting', 'email', etc.
 * sourceId: unique ID for the source
 *
 * Returns {inserted, skipped, updated}
 */
async function storeChunks(client, userId, sourceType, sourceId, chunks) {
  if (!chunks || chunks.length === 0) return { inserted: 0, skipped: 0, updated: 0 };

  var inserted = 0, skipped = 0, updated = 0;

  // First delete existing chunks for this source (clean re-ingest)
  // Check if any exist
  var existing = await client
    .from('knowledge_chunks')
    .select('id, chunk_index, content_hash')
    .eq('user_id', userId)
    .eq('source_type', sourceType)
    .eq('source_id', sourceId);

  var existingMap = {};
  if (existing.data) {
    existing.data.forEach(function(row) {
      existingMap[row.chunk_index] = row;
    });
  }

  for (var i = 0; i < chunks.length; i++) {
    var chunk = chunks[i];
    var hash = contentHash(chunk.content);
    var meta = chunk.metadata || {};

    // Check if this exact chunk already exists (by hash)
    var existingChunk = existingMap[i];
    if (existingChunk && existingChunk.content_hash === hash) {
      skipped++;
      continue;
    }

    var row = {
      user_id: userId,
      source_type: sourceType,
      source_id: sourceId,
      chunk_index: i,
      title: chunk.title || '',
      content: chunk.content,
      client_id: meta.client_id || null,
      end_client: meta.end_client || '',
      end_client_id: meta.end_client_id || null,
      campaign_id: meta.campaign_id || null,
      date: meta.date || null,
      people: meta.people || [],
      tags: meta.tags || [],
      embedding: chunk.embedding ? '[' + chunk.embedding.join(',') + ']' : null,
      embedding_model: EMBED_MODEL,
      token_count: chunk.tokens || 0,
      content_hash: hash,
      updated_at: new Date().toISOString()
    };

    if (existingChunk) {
      // Update existing
      await client.from('knowledge_chunks')
        .update(row)
        .eq('id', existingChunk.id);
      updated++;
    } else {
      // Insert new
      await client.from('knowledge_chunks')
        .insert(row);
      inserted++;
    }
  }

  // Remove extra chunks if source now has fewer chunks than before
  var oldIndices = Object.keys(existingMap).map(Number);
  for (var j = 0; j < oldIndices.length; j++) {
    if (oldIndices[j] >= chunks.length) {
      await client.from('knowledge_chunks')
        .delete()
        .eq('id', existingMap[oldIndices[j]].id);
    }
  }

  return { inserted: inserted, skipped: skipped, updated: updated };
}


/**
 * Update or create a knowledge_sources tracking row.
 */
async function upsertSource(client, userId, sourceType, sourceId, name, status, chunksCount, tokensUsed, errorMsg) {
  var row = {
    user_id: userId,
    source_type: sourceType,
    source_id: sourceId,
    name: name || '',
    status: status || 'complete',
    chunks_count: chunksCount || 0,
    tokens_used: tokensUsed || 0,
    error_message: errorMsg || '',
    last_ingested_at: new Date().toISOString()
  };

  // Try update first
  var res = await client.from('knowledge_sources')
    .update(row)
    .eq('user_id', userId)
    .eq('source_type', sourceType)
    .eq('source_id', sourceId);

  // If no rows updated, insert
  if (!res.data || (Array.isArray(res.data) && res.data.length === 0)) {
    // Check if it exists (update with no changes still returns empty)
    var check = await client.from('knowledge_sources')
      .select('id')
      .eq('user_id', userId)
      .eq('source_type', sourceType)
      .eq('source_id', sourceId)
      .maybeSingle();

    if (!check.data) {
      await client.from('knowledge_sources').insert(row);
    } else {
      await client.from('knowledge_sources')
        .update(row)
        .eq('id', check.data.id);
    }
  }
}


/* ═══════════ Search ═══════════ */

/**
 * Search knowledge base via vector similarity.
 * Returns ranked chunks with similarity scores.
 *
 * opts: { sourceType, clientId, limit, threshold }
 */
async function searchKnowledge(client, userId, queryEmbedding, opts) {
  opts = opts || {};

  var res = await client.rpc('match_knowledge', {
    query_embedding: '[' + queryEmbedding.join(',') + ']',
    match_user_id: userId,
    match_count: opts.limit || 15,
    match_threshold: opts.threshold || 0.3,
    filter_source_type: opts.sourceType || null,
    filter_client_id: opts.clientId || null
  });

  if (res.error) throw new Error('Knowledge search error: ' + res.error.message);
  return res.data || [];
}


/* ═══════════ Orphan Cleanup ═══════════ */

/**
 * Remove embeddings for records that no longer exist in the source table.
 * validSourceIds: array of source_id strings that still exist.
 * Deletes any knowledge_chunks/knowledge_sources whose source_id is NOT in validSourceIds.
 */
async function cleanOrphans(client, userId, sourceType, validSourceIds) {
  var existing = await client.from('knowledge_sources')
    .select('source_id')
    .eq('user_id', userId)
    .eq('source_type', sourceType);

  var validSet = {};
  validSourceIds.forEach(function(id) { validSet[id] = true; });

  var orphanIds = (existing.data || [])
    .filter(function(r) { return !validSet[r.source_id]; })
    .map(function(r) { return r.source_id; });

  if (orphanIds.length === 0) return 0;

  for (var i = 0; i < orphanIds.length; i++) {
    await client.from('knowledge_chunks')
      .delete()
      .eq('user_id', userId)
      .eq('source_type', sourceType)
      .eq('source_id', orphanIds[i]);

    await client.from('knowledge_sources')
      .delete()
      .eq('user_id', userId)
      .eq('source_type', sourceType)
      .eq('source_id', orphanIds[i]);
  }

  return orphanIds.length;
}


/* ═══════════ Exports ═══════════ */

module.exports = {
  getOpenAIKey: getOpenAIKey,
  embedTexts: embedTexts,
  chunkText: chunkText,
  chunkMeeting: chunkMeeting,
  chunkEmailThread: chunkEmailThread,
  chunkWebPage: chunkWebPage,
  contentHash: contentHash,
  storeChunks: storeChunks,
  upsertSource: upsertSource,
  cleanOrphans: cleanOrphans,
  searchKnowledge: searchKnowledge,
  EMBED_MODEL: EMBED_MODEL,
  EMBED_DIMS: EMBED_DIMS
};
