#!/usr/bin/env python3
"""
TaskFlow — Read.ai Historical Meeting Import
=============================================
One-time script to pull all historical meetings from Read.ai's REST API
and insert them into Supabase. Skips AI task analysis to avoid flooding
the review queue.

Requirements: Python 3.9+ (stdlib only — no pip installs)
Usage:       python3 scripts/import-readai-meetings.py

The script will:
  1. Register an OAuth 2.1 client with Read.ai (first run only)
  2. Open your browser to authorize
  3. Exchange the code for access + refresh tokens
  4. List all meetings from Read.ai API
  5. Fetch details for each meeting
  6. Insert into Supabase with ai_tasks_generated=true (no AI analysis)
  7. Auto-match clients from participant emails

Credentials are saved to scripts/.readai-import-creds.json so you can
re-run the script if it's interrupted.
"""

import json, os, sys, time, webbrowser, base64, subprocess, re
import urllib.parse
from datetime import datetime

# ── Config ──────────────────────────────────────────────────────────────────

SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://tnkmxmlgdhlgehlrbxuf.supabase.co')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')

READAI_AUTH_BASE = 'https://authn.read.ai'
READAI_API_BASE = 'https://api.read.ai'
READAI_REDIRECT_URI = 'https://api.read.ai/oauth/ui'

CREDS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.readai-import-creds.json')

# Rate limit: 100 req/min → ~1.5 req/sec max. We'll be conservative.
RATE_LIMIT_DELAY = 0.8  # seconds between API calls

# ── Helpers (uses curl for TLS compatibility) ──────────────────────────────

def api_request(url, method='GET', data=None, headers=None, auth=None):
    """Make an HTTP request via curl. Returns (status_code, response_body_dict_or_str)."""
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
    except Exception as e:
        return 0, str(e)

    # Parse status code from the appended marker
    parts = output.rsplit('\n__HTTP_STATUS__', 1)
    body_str = parts[0] if len(parts) > 1 else output
    status = int(parts[1].strip()) if len(parts) > 1 else 0

    try:
        return status, json.loads(body_str)
    except (json.JSONDecodeError, ValueError):
        return status, body_str


def supabase_select(table, filters, select='*'):
    """Select from Supabase with filters dict."""
    url = f'{SUPABASE_URL}/rest/v1/{table}?select={urllib.parse.quote(select)}'
    for k, v in filters.items():
        url += f'&{k}=eq.{urllib.parse.quote(str(v))}'
    headers = {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
    }
    return api_request(url, headers=headers)


def load_creds():
    if os.path.exists(CREDS_FILE):
        with open(CREDS_FILE) as f:
            return json.load(f)
    return {}


def save_creds(creds):
    with open(CREDS_FILE, 'w') as f:
        json.dump(creds, f, indent=2)
    print(f'  💾 Credentials saved to {CREDS_FILE}')


# ── Authentication ──────────────────────────────────────────────────────────

def get_readai_auth(creds):
    """Get Read.ai credentials — prompt if not saved."""
    if creds.get('readai_email') and creds.get('readai_password'):
        print('  ✓ Read.ai credentials loaded from saved file')
        return creds

    print('\n🔑 Read.ai API authentication')
    print('   The API uses your Read.ai account credentials.')
    print('   (If you use SSO, you may need to set a password in Read.ai account settings first)')
    print()
    creds['readai_email'] = input('   Read.ai email: ').strip()
    creds['readai_password'] = input('   Read.ai password: ').strip()

    if not creds['readai_email'] or not creds['readai_password']:
        print('  ❌ Email and password are required')
        sys.exit(1)

    save_creds(creds)
    return creds


def readai_api(creds, path, method='GET', data=None):
    """Make an authenticated Read.ai API request using basic auth."""
    headers = {'Accept': 'application/json'}
    url = f'{READAI_API_BASE}{path}'
    status, resp = api_request(
        url, method=method, data=data, headers=headers,
        auth=(creds['readai_email'], creds['readai_password'])
    )
    return status, resp, creds


# ── API Discovery ───────────────────────────────────────────────────────────

def discover_api(creds):
    """Probe Read.ai API to find the correct endpoints."""
    print('\n🔍 Discovering API endpoints...')

    # Try common patterns
    endpoints_to_try = [
        '/v1/meetings',
        '/v1/sessions',
        '/v1/meetings/list',
        '/v1/reports',
        '/mcp/list_sessions',
    ]

    working = {}

    for ep in endpoints_to_try:
        status, resp, creds = readai_api(creds, ep)
        label = '✓' if status == 200 else '✗'
        print(f'  {label} {ep} → HTTP {status}')
        if status == 200:
            # Print a summary of what we got
            if isinstance(resp, dict):
                print(f'    Keys: {list(resp.keys())}')
                # Check for pagination
                for k in ('total', 'count', 'next', 'has_more', 'total_count', 'page'):
                    if k in resp:
                        print(f'    {k}: {resp[k]}')
                # Check for data arrays
                for k in ('data', 'items', 'sessions', 'meetings', 'results'):
                    if k in resp and isinstance(resp[k], list):
                        print(f'    {k}: {len(resp[k])} items')
                        if resp[k]:
                            print(f'    First item keys: {list(resp[k][0].keys()) if isinstance(resp[k][0], dict) else type(resp[k][0])}')
                        working[ep] = {'list_key': k, 'sample': resp}
                        break
                else:
                    # Maybe it's a flat list
                    working[ep] = {'list_key': None, 'sample': resp}
            elif isinstance(resp, list):
                print(f'    Array with {len(resp)} items')
                if resp:
                    print(f'    First item keys: {list(resp[0].keys()) if isinstance(resp[0], dict) else type(resp[0])}')
                working[ep] = {'list_key': '__root__', 'sample': resp}
        time.sleep(RATE_LIMIT_DELAY)

    if not working:
        print('\n  ❌ Could not find a working meetings endpoint.')
        print('     The Read.ai API may have changed. Check their docs.')
        sys.exit(1)

    # Prefer /v1/meetings
    best = '/v1/meetings' if '/v1/meetings' in working else list(working.keys())[0]
    print(f'\n  ✓ Using endpoint: {best}')
    return best, working[best], creds


# ── Meeting Import ──────────────────────────────────────────────────────────

def load_supabase_context(user_id):
    """Load contacts, clients, and existing meeting session IDs."""
    print('\n📊 Loading Supabase context...')

    # Contacts (for client matching)
    _, contacts = supabase_select('contacts', {'user_id': user_id}, 'email,client_id')
    contacts = contacts if isinstance(contacts, list) else []
    contact_map = {}
    for c in contacts:
        if c.get('email') and c.get('client_id'):
            contact_map[c['email'].lower()] = c['client_id']
    print(f'  Contacts: {len(contact_map)} with client links')

    # Clients (for email matching)
    _, clients = supabase_select('clients', {'user_id': user_id}, 'id,email,name')
    clients = clients if isinstance(clients, list) else []
    client_email_map = {}
    client_names = {}
    for c in clients:
        if c.get('email'):
            client_email_map[c['email'].lower()] = c['id']
        if c.get('name'):
            client_names[c['id']] = c['name']
    print(f'  Clients: {len(clients)}')

    # Existing meetings (for dedup)
    _, existing = supabase_select('meetings', {'user_id': user_id}, 'session_id')
    existing = existing if isinstance(existing, list) else []
    existing_sessions = {m['session_id'] for m in existing if m.get('session_id')}
    print(f'  Existing meetings: {len(existing_sessions)}')

    return contact_map, client_email_map, client_names, existing_sessions


def match_client(participants, owner_email, contact_map, client_email_map):
    """Auto-match a client from participant emails."""
    owner_lower = (owner_email or '').lower()
    for p in (participants or []):
        email = (p.get('email') or '').lower()
        if not email or email == owner_lower:
            continue
        if email in contact_map:
            return contact_map[email]
        if email in client_email_map:
            return client_email_map[email]
    return None


def format_transcript_blocks(blocks):
    """Format transcript speaker_blocks into readable text."""
    lines = []
    for seg in (blocks or []):
        speaker = ''
        if isinstance(seg.get('speaker'), dict):
            speaker = seg['speaker'].get('name', '')
        elif isinstance(seg.get('speaker'), str):
            speaker = seg['speaker']
        elif seg.get('speaker_name'):
            speaker = seg['speaker_name']

        ts = ''
        start = seg.get('start_time')
        if start:
            # Timestamps > 1e12 are milliseconds
            ms = start if start > 1e12 else start * 1000
            try:
                d = datetime.fromtimestamp(ms / 1000)
                ts = d.strftime('%H:%M:%S')
            except (ValueError, OSError):
                pass

        words = seg.get('words') or seg.get('text') or ''
        line = ''
        if ts:
            line += f'[{ts}] '
        if speaker:
            line += f'{speaker}: '
        line += words
        lines.append(line)
    return '\n'.join(lines)


def normalise_transcript(val):
    """Normalise transcript from various formats to plain text."""
    if not val:
        return ''
    if isinstance(val, str):
        return val
    if isinstance(val, dict):
        if 'speaker_blocks' in val and isinstance(val['speaker_blocks'], list):
            return format_transcript_blocks(val['speaker_blocks'])
    if isinstance(val, list):
        return format_transcript_blocks(val)
    return str(val)


def normalise_participants(val):
    """Normalise participants to [{name, email}]."""
    if isinstance(val, list):
        return [{'name': p.get('name', ''), 'email': p.get('email', '')} for p in val if isinstance(p, dict)]
    return []


def normalise_items(val):
    """Normalise action_items/key_questions/topics to [{text}]."""
    if isinstance(val, list):
        result = []
        for item in val:
            if isinstance(item, dict):
                result.append({'text': item.get('text', '')})
            elif isinstance(item, str):
                result.append({'text': item})
        return result
    return []


def normalise_chapters(val):
    """Normalise chapter_summaries."""
    if isinstance(val, list):
        return [
            {
                'title': c.get('title', ''),
                'description': c.get('description', ''),
                'topics': c.get('topics', '')
            }
            for c in val if isinstance(c, dict)
        ]
    return []


def build_meeting_row(user_id, meeting_data, contact_map, client_email_map):
    """Build a Supabase meeting row from Read.ai API response data."""
    # The API response structure may vary — handle common field names
    m = meeting_data

    session_id = m.get('session_id') or m.get('id') or m.get('meeting_id') or ''
    title = m.get('title') or m.get('name') or ''
    start_time = m.get('start_time') or m.get('meeting_start_time') or m.get('start') or None
    end_time = m.get('end_time') or m.get('meeting_end_time') or m.get('end') or None

    # Duration
    duration_minutes = 0
    if m.get('duration_minutes'):
        duration_minutes = int(m['duration_minutes'])
    elif start_time and end_time:
        try:
            st = datetime.fromisoformat(start_time.replace('Z', '+00:00')) if isinstance(start_time, str) else start_time
            et = datetime.fromisoformat(end_time.replace('Z', '+00:00')) if isinstance(end_time, str) else end_time
            diff = (et - st).total_seconds()
            if diff > 0:
                duration_minutes = round(diff / 60)
        except (ValueError, TypeError):
            pass

    # Owner
    owner = m.get('owner', {})
    if isinstance(owner, dict):
        owner_name = owner.get('name', '')
        owner_email = owner.get('email', '')
    else:
        owner_name = ''
        owner_email = m.get('owner_email', '')

    # Participants
    participants = normalise_participants(m.get('participants', []))

    # Content
    summary = m.get('summary') or m.get('meeting_summary') or ''
    transcript = normalise_transcript(m.get('transcript'))
    action_items = normalise_items(m.get('action_items', []))
    key_questions = normalise_items(m.get('key_questions', []))
    topics = normalise_items(m.get('topics', []))
    chapter_summaries = normalise_chapters(m.get('chapter_summaries', []))
    report_url = m.get('report_url') or ''

    # Client matching
    client_id = match_client(participants, owner_email, contact_map, client_email_map)

    return {
        'user_id': user_id,
        'session_id': session_id,
        'title': title,
        'start_time': start_time,
        'end_time': end_time,
        'duration_minutes': duration_minutes,
        'participants': participants,
        'owner_name': owner_name,
        'owner_email': owner_email,
        'summary': summary,
        'transcript': transcript,
        'action_items': action_items,
        'key_questions': key_questions,
        'topics': topics,
        'chapter_summaries': chapter_summaries,
        'report_url': report_url,
        'client_id': client_id,
        'source': 'readai',
        'raw_payload': m,
        'ai_tasks_generated': True,       # ← Skip AI analysis
        'ai_suggestions': [],             # ← No suggestions
        'updated_at': datetime.utcnow().isoformat() + 'Z'
    }


def insert_meeting(row):
    """Insert a meeting into Supabase. Uses upsert on user_id+session_id."""
    url = f'{SUPABASE_URL}/rest/v1/meetings'
    headers = {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=representation'
    }
    status, resp = api_request(url, method='POST', data=row, headers=headers)
    if 200 <= status < 300:
        return True, resp
    else:
        return False, str(resp)[:200]


def fetch_all_meetings(creds, list_endpoint, list_info):
    """Fetch all meetings from the Read.ai API, handling pagination."""
    all_meetings = []
    page = 0
    page_size = 50  # Try reasonable page size

    while True:
        # Try common pagination patterns
        sep = '&' if '?' in list_endpoint else '?'
        paginated = f'{list_endpoint}{sep}limit={page_size}&offset={page * page_size}'

        status, resp, creds = readai_api(creds, paginated)

        if status != 200:
            # Try without pagination params (maybe they use different names)
            if page == 0:
                paginated = f'{list_endpoint}{sep}page_size={page_size}&page={page}'
                status, resp, creds = readai_api(creds, paginated)
            if status != 200:
                if page == 0:
                    # Last resort: try the raw endpoint
                    status, resp, creds = readai_api(creds, list_endpoint)
                if status != 200:
                    print(f'  ❌ Failed to fetch meetings (HTTP {status})')
                    break

        # Extract meetings from response
        meetings = []
        list_key = list_info.get('list_key')
        if list_key == '__root__' and isinstance(resp, list):
            meetings = resp
        elif list_key and isinstance(resp, dict) and list_key in resp:
            meetings = resp[list_key]
        elif isinstance(resp, list):
            meetings = resp
        elif isinstance(resp, dict):
            # Try common keys
            for k in ('data', 'items', 'sessions', 'meetings', 'results'):
                if k in resp and isinstance(resp[k], list):
                    meetings = resp[k]
                    break

        if not meetings:
            break

        all_meetings.extend(meetings)
        print(f'  📥 Fetched {len(all_meetings)} meetings so far...')

        # Check if there are more
        has_more = False
        if isinstance(resp, dict):
            has_more = resp.get('has_more', False) or resp.get('next') is not None
            total = resp.get('total') or resp.get('total_count')
            if total and len(all_meetings) < total:
                has_more = True

        if not has_more or len(meetings) < page_size:
            break

        page += 1
        time.sleep(RATE_LIMIT_DELAY)

    return all_meetings, creds


def fetch_meeting_details(creds, session_id, list_endpoint):
    """Fetch full details for a single meeting."""
    # Try common detail endpoint patterns
    patterns = [
        f'{list_endpoint}/{session_id}',
        f'{list_endpoint}/{session_id}/report',
        f'/v1/meetings/{session_id}',
        f'/v1/sessions/{session_id}',
    ]

    for pattern in patterns:
        status, resp, creds = readai_api(creds, pattern)
        if status == 200 and isinstance(resp, dict):
            return resp, creds
        time.sleep(RATE_LIMIT_DELAY)

    return None, creds


# ── Main ────────────────────────────────────────────────────────────────────

def main():
    print('═══════════════════════════════════════════')
    print('  TaskFlow — Read.ai Meeting Import')
    print('═══════════════════════════════════════════')

    # Check Supabase key
    if not SUPABASE_SERVICE_KEY:
        print('\n❌ SUPABASE_SERVICE_KEY environment variable not set.')
        print('   Set it with: export SUPABASE_SERVICE_KEY="your-key-here"')
        sys.exit(1)

    # Get user ID from Supabase (find the readai integration user)
    print('\n🔍 Finding TaskFlow user...')
    _, creds_rows = supabase_select(
        'integration_credentials',
        {'platform': 'readai', 'is_active': 'true'},
        'user_id'
    )
    if not creds_rows or not isinstance(creds_rows, list) or len(creds_rows) == 0:
        print('  ❌ No active Read.ai integration found in TaskFlow.')
        print('     Set up the Read.ai integration in Settings first.')
        sys.exit(1)

    user_id = creds_rows[0]['user_id']
    print(f'  ✓ User ID: {user_id}')

    # Load saved credentials
    creds = load_creds()

    # Step 1: Get Read.ai credentials
    creds = get_readai_auth(creds)

    # Step 2: Discover API
    list_endpoint, list_info, creds = discover_api(creds)

    # Step 4: Load Supabase context
    contact_map, client_email_map, client_names, existing_sessions = load_supabase_context(user_id)

    # Step 5: Fetch all meetings
    print('\n📥 Fetching all meetings from Read.ai...')
    meetings, creds = fetch_all_meetings(creds, list_endpoint, list_info)
    print(f'\n  ✓ Total meetings from Read.ai: {len(meetings)}')

    if not meetings:
        print('\n  No meetings found. Done!')
        return

    # Step 6: Import into Supabase
    print(f'\n📤 Importing meetings into TaskFlow...')
    imported = 0
    skipped = 0
    errors = 0
    needs_detail = 0

    for i, m in enumerate(meetings):
        session_id = m.get('session_id') or m.get('id') or m.get('meeting_id') or ''

        if not session_id:
            print(f'  ⚠️  Meeting {i+1}: no session_id, skipping')
            skipped += 1
            continue

        if session_id in existing_sessions:
            skipped += 1
            continue

        # Check if this is a summary-only listing (no transcript)
        # If so, try to fetch full details
        if not m.get('transcript') and not m.get('summary'):
            detail, creds = fetch_meeting_details(creds, session_id, list_endpoint)
            if detail:
                m = detail
                needs_detail += 1
            time.sleep(RATE_LIMIT_DELAY)

        # Build and insert row
        row = build_meeting_row(user_id, m, contact_map, client_email_map)
        ok, result = insert_meeting(row)

        title = (m.get('title') or 'Untitled')[:50]
        if ok:
            imported += 1
            client_note = f' → {client_names.get(row["client_id"], "?")}' if row.get('client_id') else ''
            print(f'  ✓ {imported:3d}. {title}{client_note}')
        else:
            errors += 1
            print(f'  ❌ {title}: {result[:100]}')

        # Rate limit
        if (i + 1) % 10 == 0:
            time.sleep(RATE_LIMIT_DELAY)

    # Summary
    print('\n═══════════════════════════════════════════')
    print(f'  Import complete!')
    print(f'  ✓ Imported:        {imported}')
    print(f'  ⏭ Skipped (dupes): {skipped}')
    print(f'  📄 Fetched detail:  {needs_detail}')
    print(f'  ❌ Errors:          {errors}')
    print('═══════════════════════════════════════════')

    if imported > 0:
        print(f'\n  All imported meetings have ai_tasks_generated=true')
        print(f'  → No AI tasks will be generated for these meetings.')
        print(f'  Reload TaskFlow to see them in the Meetings view.')


if __name__ == '__main__':
    main()
