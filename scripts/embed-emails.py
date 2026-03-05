#!/usr/bin/env python3
"""
TaskFlow — Embed email threads into knowledge base
=====================================================
Calls the /api/knowledge/ingest-emails endpoint in batches.
Fetches email bodies from Gmail API and embeds them.

Prerequisites:
  1. pgvector enabled + knowledge tables created
  2. OpenAI API key configured in Settings
  3. Gmail connected in TaskFlow

Usage:
  python3 scripts/embed-emails.py

Options (via environment variables):
  SINCE=2024-06-01     - Only embed emails after this date
  CLIENT_ONLY=1        - Only embed client-matched emails
  BATCH_SIZE=15        - Threads per batch (default: 15)

Environment:
  SUPABASE_SERVICE_KEY  - Required
  SUPABASE_TOKEN        - Required (from browser localStorage)
  TASKFLOW_URL          - Optional (default: https://taskflow-sigma.vercel.app)
"""

import json, os, sys, time, subprocess

TASKFLOW_URL = os.environ.get('TASKFLOW_URL', 'https://taskflow-sigma.vercel.app')
SUPABASE_URL = 'https://tnkmxmlgdhlgehlrbxuf.supabase.co'
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')
USER_ID = '78bd1255-f05a-436b-abbd-f8c281d30210'
BATCH_DELAY = 2.0  # seconds between batches (Gmail API rate limits)


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


def get_thread_count(since=None, client_only=False):
    """Count total threads eligible for embedding."""
    headers = {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
        'Prefer': 'count=exact'
    }
    url = (f'{SUPABASE_URL}/rest/v1/gmail_threads'
           f'?select=thread_id'
           f'&user_id=eq.{USER_ID}')
    if since:
        url += f'&last_message_at=gte.{since}'
    if client_only:
        url += '&client_id=not.is.null'
    url += '&limit=0'
    cmd = ['curl', '-s', '-I', '-X', 'GET']
    for k, v in headers.items():
        cmd += ['-H', f'{k}: {v}']
    cmd.append(url)
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    for line in result.stdout.split('\n'):
        if 'content-range' in line.lower():
            # Format: content-range: 0-0/12345
            parts = line.split('/')
            if len(parts) > 1:
                try:
                    return int(parts[-1].strip())
                except ValueError:
                    pass
    return -1


def get_embedded_count():
    """Count threads already embedded."""
    headers = {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
    }
    count = 0
    offset = 0
    page_size = 1000
    while True:
        url = (f'{SUPABASE_URL}/rest/v1/knowledge_sources'
               f'?select=source_id'
               f'&user_id=eq.{USER_ID}'
               f'&source_type=eq.email'
               f'&status=eq.complete'
               f'&limit={page_size}&offset={offset}')
        status, batch = api_request(url, headers=headers)
        if not isinstance(batch, list):
            break
        count += len(batch)
        if len(batch) < page_size:
            break
        offset += page_size
    return count


def main():
    print('=' * 50)
    print('  TaskFlow - Embed Email Threads')
    print('=' * 50)

    if not SUPABASE_SERVICE_KEY:
        print('\n  Set SUPABASE_SERVICE_KEY env var first.')
        sys.exit(1)

    token = os.environ.get('SUPABASE_TOKEN', '')
    if not token:
        print('\n  Set SUPABASE_TOKEN env var (from browser localStorage)')
        sys.exit(1)

    since = os.environ.get('SINCE', '')
    client_only = os.environ.get('CLIENT_ONLY', '') == '1'
    batch_size = int(os.environ.get('BATCH_SIZE', '15'))

    # Count totals
    total_threads = get_thread_count(since, client_only)
    already_embedded = get_embedded_count()
    print(f'\n  Total threads in scope: {total_threads}')
    print(f'  Already embedded:       {already_embedded}')
    if since:
        print(f'  Date filter:            since {since}')
    if client_only:
        print(f'  Client filter:          client-matched only')
    print(f'  Batch size:             {batch_size}')

    remaining = total_threads - already_embedded if total_threads > 0 else -1
    if remaining == 0:
        print('\n  Nothing to do!')
        return
    if remaining > 0:
        est_minutes = (remaining / batch_size) * (BATCH_DELAY + 5) / 60
        print(f'  Estimated remaining:    {remaining} threads (~{est_minutes:.0f} min)')

    # Process batches
    total_processed = 0
    total_chunks = 0
    total_tokens = 0
    errors = 0
    batch_num = 0

    while True:
        batch_num += 1
        print(f'\n  Batch {batch_num}...')

        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        payload = {'batchSize': batch_size}
        if since:
            payload['afterDate'] = since
        if client_only:
            payload['clientOnly'] = True

        status, resp = api_request(
            f'{TASKFLOW_URL}/api/knowledge/ingest-emails',
            method='POST', data=payload, headers=headers
        )

        if status == 200 and isinstance(resp, dict):
            processed = resp.get('processed', 0)
            chunks = resp.get('chunks', 0)
            tokens = resp.get('tokens', 0)
            total_processed += processed
            total_chunks += chunks
            total_tokens += tokens

            if processed == 0:
                print(f'    No more threads to process.')
                break

            print(f'    Processed: {processed}, Chunks: {chunks}, Tokens: {tokens}')
            print(f'    Total so far: {total_processed} threads, {total_chunks} chunks')
        elif status == 401:
            print(f'    AUTH ERROR: Token expired. Get a fresh SUPABASE_TOKEN from browser.')
            sys.exit(1)
        else:
            errors += 1
            err_msg = resp.get('error', str(resp)[:100]) if isinstance(resp, dict) else str(resp)[:100]
            print(f'    ERROR (HTTP {status}): {err_msg}')
            if errors >= 5:
                print(f'    Too many errors, stopping.')
                break

        # Progress
        if total_processed % 100 == 0 and total_processed > 0:
            print(f'\n  --- Progress: {total_processed} threads, {total_chunks} chunks, {total_tokens} tokens ---\n')

        time.sleep(BATCH_DELAY)

    print('\n' + '=' * 50)
    print(f'  Embedding complete!')
    print(f'  Threads processed:  {total_processed}')
    print(f'  Total chunks:       {total_chunks}')
    print(f'  Total tokens:       {total_tokens}')
    print(f'  Estimated cost:     ${total_tokens * 0.00002 / 1000:.4f}')
    print(f'  Errors:             {errors}')
    print('=' * 50)


if __name__ == '__main__':
    main()
