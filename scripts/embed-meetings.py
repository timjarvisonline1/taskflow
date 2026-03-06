#!/usr/bin/env python3
"""
TaskFlow — Embed meeting transcripts into knowledge base
==========================================================
Talks directly to Supabase and OpenAI (no Vercel endpoint needed).

Usage:
  SUPABASE_SERVICE_KEY="..." OPENAI_API_KEY="..." python3 scripts/embed-meetings.py
"""

import json, os, sys, time, subprocess, hashlib

SUPABASE_URL = 'https://tnkmxmlgdhlgehlrbxuf.supabase.co'
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')
USER_ID = '78bd1255-f05a-436b-abbd-f8c281d30210'
EMBED_MODEL = 'text-embedding-3-small'
OPENAI_URL = 'https://api.openai.com/v1/embeddings'
BATCH_SIZE = 3
RATE_DELAY = 0.5
FLUSH = True  # Force flush stdout


def api_request(url, method='GET', data=None, headers=None):
    cmd = ['curl', '-s', '-w', '\n__HTTP_STATUS__%{http_code}', '-X', method]
    hdrs = headers or {}
    if data is not None:
        body = json.dumps(data) if isinstance(data, dict) else str(data)
        hdrs.setdefault('Content-Type', 'application/json')
        cmd += ['-d', body]
    for k, v in hdrs.items():
        cmd += ['-H', f'{k}: {v}']
    cmd.append(url)
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        output = result.stdout
    except subprocess.TimeoutExpired:
        return 0, 'Request timed out'
    parts = output.rsplit('\n__HTTP_STATUS__', 1)
    body_str = parts[0] if len(parts) > 1 else output
    status = int(parts[1].strip()) if len(parts) > 1 else 0
    try:
        return status, json.loads(body_str)
    except (json.JSONDecodeError, ValueError):
        return status, body_str


def sb_headers():
    return {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }


def sb_get(path):
    url = f'{SUPABASE_URL}/rest/v1/{path}'
    h = {'apikey': SUPABASE_SERVICE_KEY, 'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}'}
    return api_request(url, headers=h)


def content_hash(text):
    return hashlib.sha256((text or '').encode()).hexdigest()


def chunk_text(text, max_chars=2000, overlap=200):
    if not text:
        return []
    if len(text) <= max_chars:
        return [text]
    chunks = []
    pos = 0
    while pos < len(text):
        end = min(pos + max_chars, len(text))
        if end < len(text):
            # Try to break at paragraph or sentence
            search_start = pos + int(max_chars * 0.7)
            sub = text[search_start:end]
            para = sub.rfind('\n\n')
            if para != -1:
                end = search_start + para + 2
            else:
                sent = sub.rfind('. ')
                if sent != -1:
                    end = search_start + sent + 2
                else:
                    space = text.rfind(' ', pos, end)
                    if space > pos:
                        end = space + 1
        chunks.append(text[pos:end].strip())
        pos = end - overlap
        if pos >= len(text):
            break
        if len(text) - pos < overlap:
            if chunks and len(text) - pos < max_chars * 0.3:
                chunks[-1] += '\n' + text[pos:].strip()
            else:
                chunks.append(text[pos:].strip())
            break
    return [c for c in chunks if c]


def chunk_meeting(mtg):
    chunks = []
    title = mtg.get('title') or 'Untitled Meeting'
    start = mtg.get('start_time') or ''
    date_str = start[:10] if start else ''
    participants = mtg.get('participants') or []
    people = [p.get('name') or p.get('email') or '' for p in participants if isinstance(p, dict)]
    people = [p for p in people if p]

    meta = {
        'client_id': mtg.get('client_id'),
        'end_client': mtg.get('end_client') or '',
        'campaign_id': mtg.get('campaign_id'),
        'date': start or None,
        'people': people
    }

    # Summary
    summary = mtg.get('summary') or ''
    if summary:
        chunks.append({
            'title': f'{title} - Summary ({date_str})' if date_str else f'{title} - Summary',
            'content': summary,
            'meta': meta
        })

    # Chapter summaries
    chapters = mtg.get('chapter_summaries') or []
    if isinstance(chapters, list):
        for idx, ch in enumerate(chapters):
            if not isinstance(ch, dict):
                continue
            content = ''
            if ch.get('title'):
                content += ch['title'] + '\n\n'
            if ch.get('description'):
                content += ch['description']
            if ch.get('topics'):
                content += '\n\nTopics: ' + str(ch['topics'])
            if content.strip():
                ch_title = ch.get('title') or f'Chapter {idx+1}'
                chunks.append({
                    'title': f'{title} - {ch_title} ({date_str})' if date_str else f'{title} - {ch_title}',
                    'content': content.strip(),
                    'meta': meta
                })

    # Transcript
    transcript = mtg.get('transcript') or ''
    if transcript:
        text_chunks = chunk_text(transcript, 2000, 200)
        for idx, tc in enumerate(text_chunks):
            chunks.append({
                'title': f'{title} - Transcript part {idx+1} ({date_str})' if date_str else f'{title} - Transcript part {idx+1}',
                'content': tc,
                'meta': meta
            })

    # Action items
    actions = mtg.get('action_items') or []
    if isinstance(actions, list) and actions:
        ai_text = '\n'.join(f'- {a.get("text") or a.get("description") or ""}' for a in actions if isinstance(a, dict))
        ai_text = '\n'.join(line for line in ai_text.split('\n') if len(line) > 2)
        if ai_text:
            chunks.append({
                'title': f'{title} - Action Items ({date_str})' if date_str else f'{title} - Action Items',
                'content': ai_text,
                'meta': meta
            })

    return chunks


def embed_texts(texts):
    """Call OpenAI embeddings API."""
    status, resp = api_request(OPENAI_URL, method='POST', data={
        'model': EMBED_MODEL,
        'input': texts
    }, headers={
        'Authorization': f'Bearer {OPENAI_API_KEY}',
        'Content-Type': 'application/json'
    })
    if status != 200:
        err = resp.get('error', {}).get('message', str(resp)[:200]) if isinstance(resp, dict) else str(resp)[:200]
        raise Exception(f'OpenAI error ({status}): {err}')
    total_tokens = resp.get('usage', {}).get('total_tokens', 0)
    embeddings = [item['embedding'] for item in resp['data']]
    return embeddings, total_tokens


def store_chunk(chunk, source_id, chunk_index, embedding, tokens_per):
    """Insert or update a chunk in Supabase."""
    meta = chunk.get('meta', {})
    chash = content_hash(chunk['content'])
    emb_str = '[' + ','.join(str(x) for x in embedding) + ']'

    row = {
        'user_id': USER_ID,
        'source_type': 'meeting',
        'source_id': source_id,
        'chunk_index': chunk_index,
        'title': chunk['title'],
        'content': chunk['content'],
        'client_id': meta.get('client_id'),
        'end_client': meta.get('end_client') or '',
        'campaign_id': meta.get('campaign_id'),
        'date': meta.get('date'),
        'people': meta.get('people') or [],
        'tags': [],
        'embedding': emb_str,
        'embedding_model': EMBED_MODEL,
        'token_count': tokens_per,
        'content_hash': chash,
        'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    }

    # Upsert using the unique index (user_id, source_type, source_id, chunk_index)
    url = f'{SUPABASE_URL}/rest/v1/knowledge_chunks'
    headers = sb_headers()
    headers['Prefer'] = 'resolution=merge-duplicates,return=minimal'
    status, resp = api_request(url, method='POST', data=row, headers=headers)
    return 200 <= status < 300


def store_source(source_id, name, chunks_count, tokens_used):
    """Upsert a knowledge_sources tracking row."""
    row = {
        'user_id': USER_ID,
        'source_type': 'meeting',
        'source_id': source_id,
        'name': name,
        'status': 'complete',
        'chunks_count': chunks_count,
        'tokens_used': tokens_used,
        'error_message': '',
        'last_ingested_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    }
    url = f'{SUPABASE_URL}/rest/v1/knowledge_sources'
    headers = sb_headers()
    headers['Prefer'] = 'resolution=merge-duplicates,return=minimal'
    status, resp = api_request(url, method='POST', data=row, headers=headers)
    return 200 <= status < 300


def fetch_meeting(meeting_id):
    """Fetch a single meeting with full content."""
    status, data = sb_get(
        f'meetings?select=id,title,start_time,summary,transcript,action_items,chapter_summaries,participants,client_id,end_client,campaign_id'
        f'&id=eq.{meeting_id}'
        f'&limit=1')
    if isinstance(data, list) and len(data) > 0:
        return data[0]
    return None


def main():
    print('=' * 50)
    print('  TaskFlow - Embed Meeting Transcripts')
    print('=' * 50)

    if not SUPABASE_SERVICE_KEY:
        print('\n  Set SUPABASE_SERVICE_KEY env var.')
        sys.exit(1)
    if not OPENAI_API_KEY:
        print('\n  Set OPENAI_API_KEY env var.')
        sys.exit(1)

    # Load just meeting IDs (lightweight query, no transcripts)
    print('\n  Loading meeting IDs...')
    meeting_ids = []
    offset = 0
    while True:
        status, batch = sb_get(
            f'meetings?select=id,title'
            f'&user_id=eq.{USER_ID}'
            f'&or=(transcript.neq.,summary.neq.)'
            f'&order=start_time.desc'
            f'&limit=1000&offset={offset}')
        if not isinstance(batch, list):
            print(f'  Failed: {batch}')
            sys.exit(1)
        for m in batch:
            meeting_ids.append((m['id'], m.get('title') or 'Untitled'))
        if len(batch) < 1000:
            break
        offset += 1000
    print(f'  Found {len(meeting_ids)} meetings with content')

    # Check already embedded
    print('  Checking existing embeddings...')
    embedded = set()
    offset = 0
    while True:
        status, batch = sb_get(
            f'knowledge_sources?select=source_id'
            f'&user_id=eq.{USER_ID}'
            f'&source_type=eq.meeting'
            f'&status=eq.complete'
            f'&limit=1000&offset={offset}')
        if not isinstance(batch, list):
            break
        for r in batch:
            embedded.add(r['source_id'])
        if len(batch) < 1000:
            break
        offset += 1000
    print(f'  Already embedded: {len(embedded)}')

    to_embed = [(mid, mtitle) for mid, mtitle in meeting_ids if mid not in embedded]
    print(f'  Remaining: {len(to_embed)}')

    if not to_embed:
        print('\n  Nothing to do!')
        return

    # Process in batches - fetch full content per meeting on demand
    total_chunks = 0
    total_tokens = 0
    processed = 0
    errors = 0

    for i in range(0, len(to_embed), BATCH_SIZE):
        batch_ids = to_embed[i:i + BATCH_SIZE]
        batch_num = (i // BATCH_SIZE) + 1
        total_batches = (len(to_embed) + BATCH_SIZE - 1) // BATCH_SIZE

        # Fetch full content and chunk each meeting individually
        all_chunks = []  # (meeting_id, meeting_title, chunk)
        for mid, mtitle in batch_ids:
            mtg = fetch_meeting(mid)
            if not mtg:
                continue
            chunks = chunk_meeting(mtg)
            for c in chunks:
                all_chunks.append((mid, mtitle, c))

        if not all_chunks:
            processed += len(batch_ids)
            continue

        # Embed all texts in one API call
        texts = [c[2]['content'] for c in all_chunks]
        try:
            embeddings, batch_tokens = embed_texts(texts)
            tokens_per = batch_tokens // len(texts) if texts else 0
        except Exception as e:
            errors += 1
            print(f'  ✗ Batch {batch_num}/{total_batches}: {e}')
            time.sleep(RATE_DELAY)
            continue

        total_tokens += batch_tokens

        # Store each chunk
        meeting_chunk_counts = {}
        meeting_chunk_idx = {}
        for j, (mid, mtitle, chunk) in enumerate(all_chunks):
            if mid not in meeting_chunk_idx:
                meeting_chunk_idx[mid] = 0
                meeting_chunk_counts[mid] = {'title': mtitle, 'count': 0, 'tokens': 0}
            idx = meeting_chunk_idx[mid]
            ok = store_chunk(chunk, mid, idx, embeddings[j], tokens_per)
            if ok:
                total_chunks += 1
                meeting_chunk_counts[mid]['count'] += 1
                meeting_chunk_counts[mid]['tokens'] += tokens_per
            meeting_chunk_idx[mid] = idx + 1

        # Store source tracking
        for mid, info in meeting_chunk_counts.items():
            store_source(mid, info['title'], info['count'], info['tokens'])

        processed += len(batch_ids)
        done = min(i + BATCH_SIZE, len(to_embed))
        pct = round(done / len(to_embed) * 100)
        print(f'  ✓ Batch {batch_num}/{total_batches}: {len(all_chunks)} chunks, {batch_tokens} tokens  [{done}/{len(to_embed)} = {pct}%]')

        time.sleep(RATE_DELAY)

    print('\n' + '=' * 50)
    print(f'  Done!')
    print(f'  Meetings: {processed}')
    print(f'  Chunks:   {total_chunks}')
    print(f'  Tokens:   {total_tokens}')
    print(f'  Cost:     ${total_tokens * 0.02 / 1_000_000:.4f}')
    print(f'  Errors:   {errors}')
    print('=' * 50)


if __name__ == '__main__':
    main()
