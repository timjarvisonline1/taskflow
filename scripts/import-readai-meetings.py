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
  2. Open your browser to authorize (PKCE flow)
  3. Exchange the code for access + refresh tokens
  4. List all meetings from Read.ai API
  5. Fetch details for each meeting
  6. Insert into Supabase with ai_tasks_generated=true (no AI analysis)
  7. Auto-match clients from participant emails

Credentials are saved to scripts/.readai-import-creds.json so you can
re-run the script if it's interrupted.
"""

import json, os, sys, time, webbrowser, base64, subprocess, re, hashlib, secrets
import urllib.parse
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading

# ── Config ──────────────────────────────────────────────────────────────────

SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://tnkmxmlgdhlgehlrbxuf.supabase.co')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')

READAI_AUTH_BASE = 'https://authn.read.ai'
READAI_API_BASE = 'https://api.read.ai'
READAI_REGISTER_URL = 'https://api.read.ai/oauth/register'
LOCAL_PORT = 18923
LOCAL_REDIRECT_URI = f'http://localhost:{LOCAL_PORT}/callback'

# Only import meetings where Tim is the owner or a participant
MY_EMAILS = {'tim.jarvis@timjarvis.online', 'timjarvis86@gmail.com', 'tim@timjarvis.online'}

CREDS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.readai-import-creds.json')

# Rate limit: 100 req/min
RATE_LIMIT_DELAY = 0.8

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
    print(f'  💾 Credentials saved')


# ── PKCE Helpers ────────────────────────────────────────────────────────────

def generate_code_verifier():
    """Generate a random PKCE code verifier (128 chars)."""
    chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
    return ''.join(secrets.choice(chars) for _ in range(128))


def generate_code_challenge(verifier):
    """Generate S256 PKCE code challenge from verifier."""
    digest = hashlib.sha256(verifier.encode('ascii')).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b'=').decode('ascii')


# ── OAuth 2.1 + PKCE Flow ──────────────────────────────────────────────────

def register_oauth_client(creds):
    """Register an OAuth client with Read.ai."""
    if creds.get('client_id') and creds.get('client_secret'):
        print('  ✓ OAuth client already registered')
        return creds

    print('\n📋 Registering OAuth client with Read.ai...')
    status, resp = api_request(
        READAI_REGISTER_URL,
        method='POST',
        data={
            'client_name': 'TaskFlow Meeting Import',
            'redirect_uris': [LOCAL_REDIRECT_URI],
            'grant_types': ['authorization_code', 'refresh_token'],
            'token_endpoint_auth_method': 'client_secret_basic',
            'scope': 'openid email meeting:read offline_access profile'
        }
    )

    if status not in (200, 201):
        print(f'  ❌ Registration failed (HTTP {status}):')
        print(f'     {json.dumps(resp, indent=2) if isinstance(resp, dict) else resp}')
        sys.exit(1)

    creds['client_id'] = resp['client_id']
    creds['client_secret'] = resp['client_secret']
    save_creds(creds)
    print(f'  ✓ Client registered: {creds["client_id"][:20]}...')
    return creds


# Simple callback handler to capture the authorization code
_auth_code_result = {'code': None, 'error': None}

class CallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        if 'code' in params:
            _auth_code_result['code'] = params['code'][0]
            self.send_response(200)
            self.send_header('Content-Type', 'text/html')
            self.end_headers()
            self.wfile.write(b'<html><body style="font-family:sans-serif;text-align:center;padding:60px">'
                             b'<h1>&#10004; Authorization successful!</h1>'
                             b'<p>You can close this tab and return to the terminal.</p>'
                             b'</body></html>')
        else:
            _auth_code_result['error'] = params.get('error', ['unknown'])[0]
            self.send_response(400)
            self.send_header('Content-Type', 'text/html')
            self.end_headers()
            err = _auth_code_result['error']
            self.wfile.write(f'<html><body><h1>Error: {err}</h1></body></html>'.encode())

    def log_message(self, format, *args):
        pass  # Suppress request logs


def authorize_browser(creds):
    """Open browser for PKCE authorization, capture code via local server."""
    if creds.get('access_token') and creds.get('refresh_token'):
        # Check if token might still work
        print('  ✓ Tokens already present (will refresh if needed)')
        return creds

    print('\n🌐 Browser authorization required')
    print('   Your browser will open to Read.ai\'s login page.')
    print('   Sign in and click "Allow Access".')

    # Generate PKCE verifier and challenge
    code_verifier = generate_code_verifier()
    code_challenge = generate_code_challenge(code_verifier)
    state = secrets.token_urlsafe(32)

    # Start local server to capture callback
    server = HTTPServer(('127.0.0.1', LOCAL_PORT), CallbackHandler)
    server_thread = threading.Thread(target=server.handle_request, daemon=True)
    server_thread.start()

    # Build authorization URL
    params = urllib.parse.urlencode({
        'client_id': creds['client_id'],
        'redirect_uri': LOCAL_REDIRECT_URI,
        'response_type': 'code',
        'scope': 'openid profile email meeting:read offline_access',
        'state': state,
        'code_challenge': code_challenge,
        'code_challenge_method': 'S256'
    })
    auth_url = f'{READAI_AUTH_BASE}/oauth2/auth?{params}'

    print(f'\n   Opening browser...\n')
    webbrowser.open(auth_url)
    print('   Waiting for authorization callback...')
    print('   (If the browser didn\'t open, visit this URL:)')
    print(f'   {auth_url}\n')

    # Wait for the callback
    server_thread.join(timeout=300)  # 5 minute timeout
    server.server_close()

    if _auth_code_result['error']:
        print(f'  ❌ Authorization error: {_auth_code_result["error"]}')
        sys.exit(1)

    auth_code = _auth_code_result['code']
    if not auth_code:
        print('  ❌ No authorization code received (timed out?)')
        print('     If the browser didn\'t redirect, try running the script again.')
        sys.exit(1)

    print('  ✓ Authorization code received')

    # Exchange code for tokens
    print('  🔑 Exchanging code for tokens...')
    token_data = (
        f'grant_type=authorization_code'
        f'&code={urllib.parse.quote(auth_code)}'
        f'&redirect_uri={urllib.parse.quote(LOCAL_REDIRECT_URI)}'
        f'&code_verifier={urllib.parse.quote(code_verifier)}'
    )

    status, resp = api_request(
        f'{READAI_AUTH_BASE}/oauth2/token',
        method='POST',
        data=token_data,
        auth=(creds['client_id'], creds['client_secret'])
    )

    if status != 200:
        print(f'  ❌ Token exchange failed (HTTP {status}):')
        print(f'     {json.dumps(resp, indent=2) if isinstance(resp, dict) else resp}')
        sys.exit(1)

    creds['access_token'] = resp['access_token']
    creds['refresh_token'] = resp['refresh_token']
    creds['token_expires_at'] = time.time() + resp.get('expires_in', 600)
    save_creds(creds)
    print('  ✓ Access token obtained')
    return creds


def refresh_token(creds):
    """Refresh the access token using the refresh token."""
    if not creds.get('refresh_token'):
        print('  ❌ No refresh token. Clearing credentials — re-run to re-authorize.')
        creds.pop('access_token', None)
        save_creds(creds)
        sys.exit(1)

    status, resp = api_request(
        f'{READAI_AUTH_BASE}/oauth2/token',
        method='POST',
        data=f'grant_type=refresh_token&refresh_token={urllib.parse.quote(creds["refresh_token"])}',
        auth=(creds['client_id'], creds['client_secret'])
    )

    if status != 200:
        print(f'  ⚠️  Token refresh failed (HTTP {status}). Clearing tokens — re-run to re-authorize.')
        creds.pop('access_token', None)
        creds.pop('refresh_token', None)
        save_creds(creds)
        sys.exit(1)

    creds['access_token'] = resp['access_token']
    creds['refresh_token'] = resp['refresh_token']  # Rotated
    creds['token_expires_at'] = time.time() + resp.get('expires_in', 600)
    save_creds(creds)
    return creds


def readai_api(creds, path, method='GET', data=None):
    """Make an authenticated Read.ai API request. Auto-refreshes token."""
    # Refresh if token is about to expire (within 60s)
    if time.time() > creds.get('token_expires_at', 0) - 60:
        print('  🔄 Refreshing access token...')
        creds = refresh_token(creds)

    headers = {
        'Authorization': f'Bearer {creds["access_token"]}',
        'Accept': 'application/json'
    }
    url = f'{READAI_API_BASE}{path}'
    status, resp = api_request(url, method=method, data=data, headers=headers)

    # If 401, try one refresh
    if status == 401:
        print('  🔄 Token expired, refreshing...')
        creds = refresh_token(creds)
        headers['Authorization'] = f'Bearer {creds["access_token"]}'
        status, resp = api_request(url, method=method, data=data, headers=headers)

    return status, resp, creds


# ── API Discovery ───────────────────────────────────────────────────────────

def discover_api(creds):
    """Probe Read.ai API to find the correct endpoints."""
    print('\n🔍 Discovering API endpoints...')

    endpoints_to_try = [
        '/v1/meetings',
        '/v1/sessions',
        '/v1/meetings/list',
        '/v1/reports',
    ]

    working = {}

    for ep in endpoints_to_try:
        status, resp, creds = readai_api(creds, ep)
        label = '✓' if status == 200 else '✗'
        print(f'  {label} {ep} → HTTP {status}')
        if status == 200:
            if isinstance(resp, dict):
                print(f'    Keys: {list(resp.keys())}')
                for k in ('total', 'count', 'next', 'has_more', 'total_count', 'page'):
                    if k in resp:
                        print(f'    {k}: {resp[k]}')
                for k in ('data', 'items', 'sessions', 'meetings', 'results'):
                    if k in resp and isinstance(resp[k], list):
                        print(f'    {k}: {len(resp[k])} items')
                        if resp[k]:
                            print(f'    First item keys: {list(resp[k][0].keys()) if isinstance(resp[k][0], dict) else type(resp[k][0])}')
                        working[ep] = {'list_key': k, 'sample': resp}
                        break
                else:
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

    best = '/v1/meetings' if '/v1/meetings' in working else list(working.keys())[0]
    print(f'\n  ✓ Using endpoint: {best}')
    return best, working[best], creds


# ── Meeting Import ──────────────────────────────────────────────────────────

def load_supabase_context(user_id):
    """Load contacts, clients, and existing meeting session IDs."""
    print('\n📊 Loading Supabase context...')

    _, contacts = supabase_select('contacts', {'user_id': user_id}, 'email,client_id')
    contacts = contacts if isinstance(contacts, list) else []
    contact_map = {}
    for c in contacts:
        if c.get('email') and c.get('client_id'):
            contact_map[c['email'].lower()] = c['client_id']
    print(f'  Contacts: {len(contact_map)} with client links')

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
    if isinstance(val, list):
        return [{'name': p.get('name', ''), 'email': p.get('email', '')} for p in val if isinstance(p, dict)]
    return []


def normalise_items(val):
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
    if isinstance(val, list):
        return [
            {'title': c.get('title', ''), 'description': c.get('description', ''), 'topics': c.get('topics', '')}
            for c in val if isinstance(c, dict)
        ]
    return []


def build_meeting_row(user_id, meeting_data, contact_map, client_email_map):
    m = meeting_data

    session_id = m.get('session_id') or m.get('id') or m.get('meeting_id') or ''
    title = m.get('title') or m.get('name') or ''

    # Handle timestamps — API may send start_time_ms (epoch ms) or start_time (ISO string)
    start_time = m.get('start_time') or m.get('meeting_start_time') or m.get('start') or None
    end_time = m.get('end_time') or m.get('meeting_end_time') or m.get('end') or None

    # Convert epoch ms to ISO strings
    if m.get('start_time_ms') and not start_time:
        try:
            start_time = datetime.utcfromtimestamp(m['start_time_ms'] / 1000).isoformat() + 'Z'
        except (ValueError, TypeError, OSError):
            pass
    if m.get('end_time_ms') and not end_time:
        try:
            end_time = datetime.utcfromtimestamp(m['end_time_ms'] / 1000).isoformat() + 'Z'
        except (ValueError, TypeError, OSError):
            pass

    duration_minutes = 0
    if m.get('duration_minutes'):
        duration_minutes = int(m['duration_minutes'])
    elif m.get('start_time_ms') and m.get('end_time_ms'):
        diff_ms = m['end_time_ms'] - m['start_time_ms']
        if diff_ms > 0:
            duration_minutes = round(diff_ms / 60000)
    elif start_time and end_time:
        try:
            st = datetime.fromisoformat(start_time.replace('Z', '+00:00')) if isinstance(start_time, str) else start_time
            et = datetime.fromisoformat(end_time.replace('Z', '+00:00')) if isinstance(end_time, str) else end_time
            diff = (et - st).total_seconds()
            if diff > 0:
                duration_minutes = round(diff / 60)
        except (ValueError, TypeError):
            pass

    owner = m.get('owner', {})
    if isinstance(owner, dict):
        owner_name = owner.get('name', '')
        owner_email = owner.get('email', '')
    else:
        owner_name = ''
        owner_email = m.get('owner_email', '')

    participants = normalise_participants(m.get('participants', []))
    summary = m.get('summary') or m.get('meeting_summary') or ''
    transcript = normalise_transcript(m.get('transcript'))
    action_items = normalise_items(m.get('action_items', []))
    key_questions = normalise_items(m.get('key_questions', []))
    topics = normalise_items(m.get('topics', []))
    chapter_summaries = normalise_chapters(m.get('chapter_summaries', []))
    report_url = m.get('report_url') or ''

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
    """Fetch all meetings using cursor-based pagination (Stripe-style)."""
    all_meetings = []
    cursor = None  # starting_after cursor

    while True:
        # Build URL with cursor pagination
        url = list_endpoint
        params = []
        if cursor:
            params.append(f'starting_after={urllib.parse.quote(cursor)}')
        if params:
            url += '?' + '&'.join(params)

        status, resp, creds = readai_api(creds, url)

        if status != 200:
            print(f'  ❌ Failed to fetch meetings (HTTP {status})')
            if isinstance(resp, dict):
                print(f'     {resp}')
            break

        # Extract meetings from response
        meetings = []
        if isinstance(resp, dict) and 'data' in resp:
            meetings = resp['data']
        elif isinstance(resp, list):
            meetings = resp

        if not meetings:
            break

        all_meetings.extend(meetings)
        print(f'  📥 Fetched {len(all_meetings)} meetings so far...')

        # Check for more pages (Stripe-style: has_more + last item id as cursor)
        has_more = isinstance(resp, dict) and resp.get('has_more', False)
        if has_more and meetings:
            last_item = meetings[-1]
            cursor = last_item.get('id') or last_item.get('session_id')
            if not cursor:
                break  # Can't paginate without an ID
        else:
            break

        time.sleep(RATE_LIMIT_DELAY)

    return all_meetings, creds


def is_my_meeting(m):
    """Check if Tim is the owner or a participant of this meeting."""
    # Check owner
    owner = m.get('owner', {})
    if isinstance(owner, dict):
        owner_email = (owner.get('email') or '').lower()
    else:
        owner_email = (m.get('owner_email') or '').lower()
    if owner_email in MY_EMAILS:
        return True

    # Check participants
    for p in (m.get('participants') or []):
        if isinstance(p, dict):
            pe = (p.get('email') or '').lower()
            if pe in MY_EMAILS:
                return True

    return False


def fetch_meeting_details(creds, session_id, list_endpoint):
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

    if not SUPABASE_SERVICE_KEY:
        print('\n❌ SUPABASE_SERVICE_KEY environment variable not set.')
        print('   Set it with: export SUPABASE_SERVICE_KEY="your-key-here"')
        sys.exit(1)

    # Get user ID
    print('\n🔍 Finding TaskFlow user...')
    _, creds_rows = supabase_select(
        'integration_credentials',
        {'platform': 'readai', 'is_active': 'true'},
        'user_id'
    )
    if not creds_rows or not isinstance(creds_rows, list) or len(creds_rows) == 0:
        print('  ❌ No active Read.ai integration found in TaskFlow.')
        sys.exit(1)

    user_id = creds_rows[0]['user_id']
    print(f'  ✓ User ID: {user_id}')

    # Load saved credentials
    creds = load_creds()

    # Step 1: Register OAuth client
    creds = register_oauth_client(creds)

    # Step 2: Browser authorization (PKCE)
    creds = authorize_browser(creds)

    # Step 3: Discover API
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

    # Step 6: Filter to only Tim's meetings and import
    my_meetings = [m for m in meetings if is_my_meeting(m)]
    print(f'\n  🔍 Filtered: {len(my_meetings)} meetings where you are owner/participant (of {len(meetings)} total)')

    print(f'\n📤 Importing meetings into TaskFlow...')
    imported = 0
    skipped = 0
    errors = 0
    needs_detail = 0
    filtered = len(meetings) - len(my_meetings)

    for i, m in enumerate(my_meetings):
        session_id = m.get('session_id') or m.get('id') or m.get('meeting_id') or ''

        if not session_id:
            print(f'  ⚠️  Meeting {i+1}: no session_id, skipping')
            skipped += 1
            continue

        if session_id in existing_sessions:
            skipped += 1
            continue

        if not m.get('transcript') and not m.get('summary'):
            detail, creds = fetch_meeting_details(creds, session_id, list_endpoint)
            if detail:
                m = detail
                needs_detail += 1
            time.sleep(RATE_LIMIT_DELAY)

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

        if (i + 1) % 10 == 0:
            time.sleep(RATE_LIMIT_DELAY)

    # Summary
    print('\n═══════════════════════════════════════════')
    print(f'  Import complete!')
    print(f'  ✓ Imported:        {imported}')
    print(f'  ⏭ Skipped (dupes): {skipped}')
    print(f'  🚫 Filtered (not yours): {filtered}')
    print(f'  📄 Fetched detail:  {needs_detail}')
    print(f'  ❌ Errors:          {errors}')
    print('═══════════════════════════════════════════')

    if imported > 0:
        print(f'\n  All imported meetings have ai_tasks_generated=true')
        print(f'  → No AI tasks will be generated for these meetings.')
        print(f'  Reload TaskFlow to see them in the Meetings view.')


if __name__ == '__main__':
    main()
