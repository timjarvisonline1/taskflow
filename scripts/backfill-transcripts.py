#!/usr/bin/env python3
"""
TaskFlow — Backfill Read.ai meeting transcripts
=================================================
Fetches full transcript, summary, action_items, key_questions, topics,
and chapter_summaries for meetings already imported into Supabase.

Uses the Read.ai expand[] parameter discovered during API testing.
Skips meetings that already have transcript data (from webhook).

Usage: SUPABASE_SERVICE_KEY="..." python3 scripts/backfill-transcripts.py
"""

import json, os, sys, time, subprocess, urllib.parse
from datetime import datetime

SUPABASE_URL = 'https://tnkmxmlgdhlgehlrbxuf.supabase.co'
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')
READAI_AUTH_BASE = 'https://authn.read.ai'
READAI_API_BASE = 'https://api.read.ai'
CREDS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.readai-import-creds.json')
USER_ID = '78bd1255-f05a-436b-abbd-f8c281d30210'
EXPAND_FIELDS = 'expand[]=transcript&expand[]=summary&expand[]=action_items&expand[]=key_questions&expand[]=topics&expand[]=chapter_summaries'
RATE_LIMIT_DELAY = 0.7  # ~85 req/min (limit is 100)

def api_request(url, method='GET', data=None, headers=None, auth=None):
    cmd = ['curl', '-s', '-w', '\n__HTTP_STATUS__%{http_code}', '-X', method]
    hdrs = headers or {}
    if data is not None:
        if isinstance(data, dict):
            body = json.dumps(data)
            hdrs.setdefault('Content-Type', 'application/json')
        else:
            body = str(data)
            hdrs.setdefault('Content-Type', 'application/x-www-form-urlencoded')
        cmd += ['-d', body]
    if auth:
        cmd += ['-u', f'{auth[0]}:{auth[1]}']
    for k, v in hdrs.items():
        cmd += ['-H', f'{k}: {v}']
    cmd.append(url)
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
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


def load_creds():
    with open(CREDS_FILE) as f:
        return json.load(f)

def save_creds(creds):
    with open(CREDS_FILE, 'w') as f:
        json.dump(creds, f, indent=2)

def refresh_token(creds):
    status, resp = api_request(
        f'{READAI_AUTH_BASE}/oauth2/token', method='POST',
        data=f'grant_type=refresh_token&refresh_token={urllib.parse.quote(creds["refresh_token"])}',
        auth=(creds['client_id'], creds['client_secret'])
    )
    if status != 200:
        print(f'  Token refresh failed (HTTP {status}): {resp}')
        sys.exit(1)
    creds['access_token'] = resp['access_token']
    creds['refresh_token'] = resp['refresh_token']
    creds['token_expires_at'] = time.time() + resp.get('expires_in', 600)
    save_creds(creds)
    return creds

def readai_get(creds, path):
    if time.time() > creds.get('token_expires_at', 0) - 60:
        print('  Refreshing token...', end=' ')
        creds = refresh_token(creds)
        print('OK')
    headers = {
        'Authorization': f'Bearer {creds["access_token"]}',
        'Accept': 'application/json'
    }
    status, resp = api_request(f'{READAI_API_BASE}{path}', headers=headers)
    if status == 401:
        creds = refresh_token(creds)
        headers['Authorization'] = f'Bearer {creds["access_token"]}'
        status, resp = api_request(f'{READAI_API_BASE}{path}', headers=headers)
    return status, resp, creds


def format_transcript(transcript_obj):
    """Convert Read.ai transcript object to readable text."""
    if not transcript_obj:
        return ''
    if isinstance(transcript_obj, str):
        return transcript_obj

    # transcript is {speakers: [...], turns: [...], text: "..."}
    if isinstance(transcript_obj, dict):
        # If there's a plain text version, use it
        if transcript_obj.get('text'):
            return transcript_obj['text']

        # Otherwise build from turns
        turns = transcript_obj.get('turns', [])
        speakers = {s.get('id', ''): s.get('name', '') for s in transcript_obj.get('speakers', [])}
        lines = []
        for turn in turns:
            speaker = speakers.get(str(turn.get('speaker_id', '')), turn.get('speaker', ''))
            text = turn.get('text', turn.get('words', ''))
            start = turn.get('start_time', turn.get('start', ''))
            ts = ''
            if start:
                try:
                    ms = start if start > 1e12 else start * 1000
                    d = datetime.fromtimestamp(ms / 1000)
                    ts = d.strftime('%H:%M:%S')
                except (ValueError, TypeError, OSError):
                    pass
            line = ''
            if ts:
                line += f'[{ts}] '
            if speaker:
                line += f'{speaker}: '
            line += text
            lines.append(line)
        return '\n'.join(lines)

    return str(transcript_obj)


def normalise_items(val):
    if isinstance(val, list):
        result = []
        for item in val:
            if isinstance(item, dict):
                result.append({'text': item.get('text', item.get('description', ''))})
            elif isinstance(item, str):
                result.append({'text': item})
        return result
    return []


def normalise_chapters(val):
    if isinstance(val, list):
        return [
            {'title': c.get('title', ''), 'description': c.get('description', ''), 'topics': c.get('topics', '')}
            for c in val if isinstance(c, dict)
        ]
    return []


def main():
    print('═══════════════════════════════════════════')
    print('  TaskFlow — Backfill Meeting Transcripts')
    print('═══════════════════════════════════════════')

    if not SUPABASE_SERVICE_KEY:
        print('\n  Set SUPABASE_SERVICE_KEY env var first.')
        sys.exit(1)

    # Get meetings without transcripts
    print('\n  Loading meetings without transcripts...')
    sb_headers = {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
    }
    # Get ALL meetings where transcript is empty/null (paginate past Supabase 1000-row limit)
    meetings = []
    page_size = 1000
    offset = 0
    while True:
        url = (f'{SUPABASE_URL}/rest/v1/meetings'
               f'?select=id,session_id,title,transcript'
               f'&user_id=eq.{USER_ID}'
               f'&or=(transcript.is.null,transcript.eq.)'
               f'&order=id'
               f'&limit={page_size}&offset={offset}')
        status, batch = api_request(url, headers=sb_headers)
        if not isinstance(batch, list):
            print(f'  Failed to load meetings: {batch}')
            sys.exit(1)
        meetings.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size

    print(f'  Found {len(meetings)} meetings without transcripts')
    if not meetings:
        print('  Nothing to do!')
        return

    # Load OAuth creds
    creds = load_creds()

    updated = 0
    skipped = 0
    errors = 0
    no_data = 0

    for i, mtg in enumerate(meetings):
        session_id = mtg.get('session_id', '')
        title = (mtg.get('title') or 'Untitled')[:50]
        db_id = mtg['id']

        if not session_id:
            skipped += 1
            continue

        # Fetch full meeting data from Read.ai
        status, resp, creds = readai_get(creds, f'/v1/meetings/{session_id}?{EXPAND_FIELDS}')

        if status != 200:
            if status == 404:
                no_data += 1
                print(f'  — {i+1:4d}. {title} (not found in Read.ai)')
            else:
                errors += 1
                print(f'  ✗ {i+1:4d}. {title} (HTTP {status})')
            time.sleep(RATE_LIMIT_DELAY)
            continue

        # Extract expanded fields
        transcript = format_transcript(resp.get('transcript'))
        summary = resp.get('summary', '')
        action_items = normalise_items(resp.get('action_items', []))
        key_questions = normalise_items(resp.get('key_questions', []))
        topics = normalise_items(resp.get('topics', []))
        chapter_summaries = normalise_chapters(resp.get('chapter_summaries', []))

        if not transcript and not summary:
            no_data += 1
            print(f'  — {i+1:4d}. {title} (no transcript/summary available)')
            time.sleep(RATE_LIMIT_DELAY)
            continue

        # Update Supabase
        update_data = {
            'transcript': transcript,
            'summary': summary,
            'action_items': action_items,
            'key_questions': key_questions,
            'topics': topics,
            'chapter_summaries': chapter_summaries,
            'updated_at': datetime.utcnow().isoformat() + 'Z'
        }

        update_url = f'{SUPABASE_URL}/rest/v1/meetings?id=eq.{db_id}'
        update_headers = {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        }
        up_status, up_resp = api_request(update_url, method='PATCH', data=update_data, headers=update_headers)

        if 200 <= up_status < 300:
            updated += 1
            t_len = len(transcript) if transcript else 0
            s_len = len(summary) if summary else 0
            print(f'  ✓ {i+1:4d}. {title} (transcript: {t_len}, summary: {s_len})')
        else:
            errors += 1
            print(f'  ✗ {i+1:4d}. {title} (Supabase error: {str(up_resp)[:80]})')

        time.sleep(RATE_LIMIT_DELAY)

        # Progress update every 100
        if (i + 1) % 100 == 0:
            print(f'\n  --- Progress: {i+1}/{len(meetings)} | Updated: {updated} | No data: {no_data} | Errors: {errors} ---\n')

    print('\n═══════════════════════════════════════════')
    print(f'  Backfill complete!')
    print(f'  ✓ Updated:         {updated}')
    print(f'  — No data:         {no_data}')
    print(f'  ⏭ Skipped:         {skipped}')
    print(f'  ✗ Errors:          {errors}')
    print('═══════════════════════════════════════════')


if __name__ == '__main__':
    main()
