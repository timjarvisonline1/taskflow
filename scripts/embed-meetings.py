#!/usr/bin/env python3
"""
TaskFlow — Embed meeting transcripts into knowledge base
==========================================================
Calls the /api/knowledge/ingest-meetings endpoint in batches.
Processes 10 meetings per call, with progress tracking.

Prerequisites:
  1. Enable pgvector in Supabase Dashboard
  2. Run supabase/add-knowledge-base.sql
  3. Add OpenAI API key in TaskFlow Settings
  4. Deploy api/knowledge/ingest-meetings.js to Vercel

Usage:
  python3 scripts/embed-meetings.py

Environment:
  TASKFLOW_URL  - TaskFlow base URL (default: https://taskflow-sigma.vercel.app)
  SUPABASE_TOKEN - Your Supabase auth token (from browser localStorage)
"""

import json, os, sys, time, subprocess

TASKFLOW_URL = os.environ.get('TASKFLOW_URL', 'https://taskflow-sigma.vercel.app')
SUPABASE_URL = 'https://tnkmxmlgdhlgehlrbxuf.supabase.co'
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')
USER_ID = '78bd1255-f05a-436b-abbd-f8c281d30210'
BATCH_DELAY = 1.0  # seconds between batches


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


def get_meetings_with_content():
    """Get all meeting IDs that have transcript or summary content."""
    meetings = []
    page_size = 1000
    offset = 0
    headers = {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
    }
    while True:
        url = (f'{SUPABASE_URL}/rest/v1/meetings'
               f'?select=id,title'
               f'&user_id=eq.{USER_ID}'
               f'&or=(transcript.neq.,summary.neq.)'
               f'&order=start_time.desc'
               f'&limit={page_size}&offset={offset}')
        status, batch = api_request(url, headers=headers)
        if not isinstance(batch, list):
            print(f'  Failed to load meetings: {batch}')
            sys.exit(1)
        meetings.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size
    return meetings


def get_embedded_meeting_ids():
    """Get IDs of meetings already embedded."""
    embedded = set()
    headers = {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
    }
    offset = 0
    page_size = 1000
    while True:
        url = (f'{SUPABASE_URL}/rest/v1/knowledge_sources'
               f'?select=source_id'
               f'&user_id=eq.{USER_ID}'
               f'&source_type=eq.meeting'
               f'&status=eq.complete'
               f'&limit={page_size}&offset={offset}')
        status, batch = api_request(url, headers=headers)
        if not isinstance(batch, list):
            break
        for row in batch:
            embedded.add(row['source_id'])
        if len(batch) < page_size:
            break
        offset += page_size
    return embedded


def ingest_batch(meeting_ids, token):
    """Call the ingestion endpoint for a batch of meetings."""
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    url = f'{TASKFLOW_URL}/api/knowledge/ingest-meetings'
    status, resp = api_request(url, method='POST', data={'meetingIds': meeting_ids}, headers=headers)
    return status, resp


def main():
    print('=' * 50)
    print('  TaskFlow - Embed Meeting Transcripts')
    print('=' * 50)

    if not SUPABASE_SERVICE_KEY:
        print('\n  Set SUPABASE_SERVICE_KEY env var first.')
        sys.exit(1)

    # Get auth token
    token = os.environ.get('SUPABASE_TOKEN', '')
    if not token:
        print('\n  Set SUPABASE_TOKEN env var (copy from browser localStorage > sb-tnkmxmlgdhlgehlrbxuf-auth-token > access_token)')
        sys.exit(1)

    # Load meetings
    print('\n  Loading meetings with content...')
    all_meetings = get_meetings_with_content()
    print(f'  Found {len(all_meetings)} meetings with transcripts/summaries')

    # Check already embedded
    print('  Checking existing embeddings...')
    embedded = get_embedded_meeting_ids()
    print(f'  Already embedded: {len(embedded)}')

    # Filter to un-embedded
    to_embed = [m for m in all_meetings if m['id'] not in embedded]
    print(f'  Remaining to embed: {len(to_embed)}')

    if not to_embed:
        print('\n  Nothing to do!')
        return

    # Process in batches
    total_chunks = 0
    total_tokens = 0
    errors = 0
    batch_size = 10

    for i in range(0, len(to_embed), batch_size):
        batch = to_embed[i:i + batch_size]
        batch_ids = [m['id'] for m in batch]
        batch_num = (i // batch_size) + 1
        total_batches = (len(to_embed) + batch_size - 1) // batch_size

        print(f'\n  Batch {batch_num}/{total_batches} ({len(batch)} meetings)...')
        status, resp = ingest_batch(batch_ids, token)

        if status == 200 and isinstance(resp, dict):
            processed = resp.get('processed', 0)
            chunks = resp.get('chunks', 0)
            tokens = resp.get('tokens', 0)
            total_chunks += chunks
            total_tokens += tokens
            print(f'    Processed: {processed}, Chunks: {chunks}, Tokens: {tokens}')
        else:
            errors += 1
            err_msg = resp.get('error', str(resp)[:100]) if isinstance(resp, dict) else str(resp)[:100]
            print(f'    ERROR (HTTP {status}): {err_msg}')

        # Progress update
        done = min(i + batch_size, len(to_embed))
        pct = round(done / len(to_embed) * 100)
        print(f'    Progress: {done}/{len(to_embed)} ({pct}%)')

        time.sleep(BATCH_DELAY)

    print('\n' + '=' * 50)
    print(f'  Embedding complete!')
    print(f'  Meetings processed: {len(to_embed) - errors * batch_size}')
    print(f'  Total chunks:       {total_chunks}')
    print(f'  Total tokens:       {total_tokens}')
    print(f'  Estimated cost:     ${total_tokens * 0.00002 / 1000:.4f}')
    print(f'  Errors:             {errors}')
    print('=' * 50)


if __name__ == '__main__':
    main()
