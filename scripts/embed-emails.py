#!/usr/bin/env python3
"""
TaskFlow — Embed email threads into the knowledge base
========================================================
Fetches email bodies from Gmail API, chunks per message,
embeds via OpenAI, stores in knowledge_chunks.

Talks directly to Gmail API / Supabase / OpenAI (no Vercel endpoint).
Auto-refreshes Gmail OAuth token when expired.

Usage:
  SUPABASE_SERVICE_KEY="..." OPENAI_API_KEY="..." python3 -u scripts/embed-emails.py [--offset N] [--limit N]

Options:
  --offset N        Skip first N threads (default: 0)
  --limit N         Process at most N threads (default: 0 = all)
  --client-only     Only embed threads matched to a client
"""

import json, os, sys, time, subprocess, hashlib, gc, base64, re, html, argparse
from datetime import datetime, timezone
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError

SUPABASE_URL = 'https://tnkmxmlgdhlgehlrbxuf.supabase.co'
SK = os.environ.get('SUPABASE_SERVICE_KEY', '')
OAI = os.environ.get('OPENAI_API_KEY', '')
UID = '78bd1255-f05a-436b-abbd-f8c281d30210'

GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me'
EMBED_MODEL = 'text-embedding-3-small'

parser = argparse.ArgumentParser()
parser.add_argument('--offset', type=int, default=0)
parser.add_argument('--limit', type=int, default=0, help='0 = all')
parser.add_argument('--client-only', action='store_true', help='Only embed client-matched threads')
parser.add_argument('--from-gmail', action='store_true', help='Pull ALL thread IDs from Gmail API (not just gmail_threads table)')
args = parser.parse_args()


def curl(url, method='GET', data=None, hdrs=None):
    """Simple curl wrapper returning (status, parsed_json)."""
    cmd = ['curl', '-s', '-w', '\nSTATUS:%{http_code}', '-X', method]
    if data:
        cmd += ['-d', json.dumps(data)]
    for k, v in (hdrs or {}).items():
        cmd += ['-H', f'{k}: {v}']
    cmd.append(url)
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        p = r.stdout.rsplit('\nSTATUS:', 1)
        s = int(p[1].strip()) if len(p) > 1 else 0
        try:
            return s, json.loads(p[0])
        except:
            return s, p[0]
    except subprocess.TimeoutExpired:
        return 0, 'timeout'


def http_post_form(url, form_data):
    """URL-encoded POST (for OAuth token refresh)."""
    encoded = urlencode(form_data).encode('utf-8')
    req = Request(url, data=encoded, method='POST')
    req.add_header('Content-Type', 'application/x-www-form-urlencoded')
    try:
        resp = urlopen(req, timeout=30)
        return json.loads(resp.read().decode('utf-8'))
    except HTTPError as e:
        body = e.read().decode('utf-8')
        try:
            return json.loads(body)
        except:
            return {'error': str(e)}


SB = {'apikey': SK, 'Authorization': f'Bearer {SK}'}
SBP = {**SB, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates,return=minimal'}


# ═══════════════════════════════════════════════════════════════════════
#  Gmail Auth
# ═══════════════════════════════════════════════════════════════════════

gmail_access_token = None
gmail_token_expires = 0
gmail_cred_id = None
gmail_refresh_token = None
gmail_client_id = None
gmail_client_secret = None


def load_gmail_credentials():
    """Load Gmail OAuth credentials from integration_credentials."""
    global gmail_access_token, gmail_token_expires, gmail_cred_id
    global gmail_refresh_token, gmail_client_id, gmail_client_secret

    _, data = curl(
        f'{SUPABASE_URL}/rest/v1/integration_credentials?select=id,credentials'
        f'&user_id=eq.{UID}&platform=eq.gmail&limit=1',
        hdrs=SB
    )
    if not isinstance(data, list) or not data:
        print('  ERROR: No Gmail credentials found in integration_credentials')
        sys.exit(1)

    row = data[0]
    creds = row.get('credentials', {})
    gmail_cred_id = row['id']
    gmail_access_token = creds.get('access_token', '')
    gmail_refresh_token = creds.get('refresh_token', '')
    gmail_client_id = creds.get('client_id', '')
    gmail_client_secret = creds.get('client_secret', '')

    exp = creds.get('token_expires_at', '')
    if exp:
        try:
            dt = datetime.fromisoformat(exp.replace('Z', '+00:00'))
            gmail_token_expires = dt.timestamp()
        except:
            gmail_token_expires = 0

    remaining = max(0, int(gmail_token_expires - time.time()))
    print(f'  Gmail credentials loaded (token expires in {remaining}s)')


def ensure_gmail_token():
    """Refresh Gmail access token if expired or within 60s of expiry."""
    global gmail_access_token, gmail_token_expires

    if gmail_token_expires > time.time() + 60 and gmail_access_token:
        return gmail_access_token

    print('  Refreshing Gmail access token...', flush=True)
    resp = http_post_form('https://oauth2.googleapis.com/token', {
        'refresh_token': gmail_refresh_token,
        'client_id': gmail_client_id,
        'client_secret': gmail_client_secret,
        'grant_type': 'refresh_token'
    })

    if 'error' in resp:
        print(f'  ERROR: Token refresh failed: {resp.get("error_description", resp.get("error"))}')
        sys.exit(1)

    gmail_access_token = resp['access_token']
    expires_in = resp.get('expires_in', 3600)
    gmail_token_expires = time.time() + expires_in

    # Update stored token in Supabase
    new_creds = {
        'access_token': gmail_access_token,
        'refresh_token': gmail_refresh_token,
        'client_id': gmail_client_id,
        'client_secret': gmail_client_secret,
        'token_expires_at': datetime.fromtimestamp(gmail_token_expires, tz=timezone.utc).isoformat()
    }
    curl(
        f'{SUPABASE_URL}/rest/v1/integration_credentials?id=eq.{gmail_cred_id}',
        method='PATCH',
        data={'credentials': new_creds, 'updated_at': datetime.now(timezone.utc).isoformat()},
        hdrs=SBP
    )
    print(f'  Token refreshed (valid for {expires_in}s)', flush=True)
    return gmail_access_token


# ═══════════════════════════════════════════════════════════════════════
#  Gmail Thread Discovery (for --from-gmail mode)
# ═══════════════════════════════════════════════════════════════════════

def discover_all_gmail_threads(max_threads=0):
    """Paginate through Gmail threads.list to get ALL thread IDs.
    If max_threads > 0, stop early once we have enough (for quick tests)."""
    token = ensure_gmail_token()
    all_threads = []
    page_token = None
    page = 0

    while True:
        page += 1
        page_size = min(500, max_threads - len(all_threads)) if max_threads > 0 else 500
        if page_size <= 0:
            break

        url = f'{GMAIL_API}/threads?maxResults={page_size}&includeSpamTrash=false'
        if page_token:
            url += f'&pageToken={page_token}'

        # Re-check token every 50 pages (~25K threads discovered)
        if page % 50 == 0:
            token = ensure_gmail_token()

        cmd = ['curl', '-s', '-w', '\nSTATUS:%{http_code}',
               '-H', f'Authorization: Bearer {token}', url]
        try:
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        except subprocess.TimeoutExpired:
            print(f'    Page {page}: timeout, retrying...', flush=True)
            time.sleep(2)
            continue

        p = r.stdout.rsplit('\nSTATUS:', 1)
        status = int(p[1].strip()) if len(p) > 1 else 0

        if status == 429:
            print(f'    Rate limited, waiting 10s...', flush=True)
            time.sleep(10)
            continue

        if status != 200:
            print(f'    Page {page}: HTTP {status}, stopping discovery', flush=True)
            break

        try:
            data = json.loads(p[0])
        except:
            print(f'    Page {page}: JSON parse error, stopping', flush=True)
            break

        threads = data.get('threads', [])
        for t in threads:
            all_threads.append(t['id'])

        if page % 20 == 0:
            est = data.get('resultSizeEstimate', '?')
            print(f'    Page {page}: {len(all_threads)} threads discovered (est: {est})', flush=True)

        # Stop early if we have enough
        if max_threads > 0 and len(all_threads) >= max_threads:
            break

        page_token = data.get('nextPageToken')
        if not page_token:
            break

        time.sleep(0.1)  # Light rate limiting on list calls

    return all_threads


def lookup_crm_metadata(thread_ids_batch):
    """Look up CRM metadata from gmail_threads table for a batch of thread IDs."""
    metadata = {}
    # PostgREST IN filter
    ids_filter = ','.join(thread_ids_batch)
    _, data = curl(
        f'{SUPABASE_URL}/rest/v1/gmail_threads?select=thread_id,subject,client_id,end_client,campaign_id,last_message_at'
        f'&user_id=eq.{UID}&thread_id=in.({ids_filter})',
        hdrs=SB
    )
    if isinstance(data, list):
        for t in data:
            metadata[t['thread_id']] = t
    return metadata


# ═══════════════════════════════════════════════════════════════════════
#  Gmail Body Extraction
# ═══════════════════════════════════════════════════════════════════════

def decode_base64url(data):
    """Decode Gmail's base64url-encoded body."""
    padded = data + '=' * (4 - len(data) % 4)
    return base64.urlsafe_b64decode(padded).decode('utf-8', errors='replace')


def strip_html(text):
    """Strip HTML tags and decode entities."""
    text = re.sub(r'<br\s*/?\s*>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'</(p|div|tr|li|h[1-6])>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = html.unescape(text)
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def extract_text_body(payload):
    """Extract plain text body from Gmail message payload."""
    if not payload:
        return ''

    # Direct body (single-part message)
    if payload.get('mimeType') == 'text/plain' and payload.get('body', {}).get('data'):
        return decode_base64url(payload['body']['data'])

    parts = payload.get('parts', [])

    # Look for text/plain first
    for part in parts:
        if part.get('mimeType') == 'text/plain' and part.get('body', {}).get('data'):
            return decode_base64url(part['body']['data'])
        if part.get('parts'):
            nested = extract_text_body(part)
            if nested:
                return nested

    # Fallback: strip HTML
    for part in parts:
        if part.get('mimeType') == 'text/html' and part.get('body', {}).get('data'):
            return strip_html(decode_base64url(part['body']['data']))

    return ''


def get_header(msg, name):
    """Get header value from a Gmail message."""
    for h in msg.get('payload', {}).get('headers', []):
        if h['name'].lower() == name.lower():
            return h['value']
    return ''


def parse_from(raw):
    """Parse 'Name <email>' format."""
    m = re.match(r'^(.+?)\s*<(.+?)>$', raw)
    if m:
        return m.group(1).strip().strip('"'), m.group(2).strip()
    return raw.strip(), raw.strip()


def fetch_thread_messages(thread_id):
    """Fetch full thread from Gmail API and extract messages."""
    token = ensure_gmail_token()

    cmd = ['curl', '-s', '-w', '\nSTATUS:%{http_code}',
           '-H', f'Authorization: Bearer {token}',
           f'{GMAIL_API}/threads/{thread_id}?format=full']

    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    except subprocess.TimeoutExpired:
        return None

    p = r.stdout.rsplit('\nSTATUS:', 1)
    status = int(p[1].strip()) if len(p) > 1 else 0

    if status == 404:
        return []  # Thread deleted/missing
    if status != 200:
        return None  # Error

    try:
        data = json.loads(p[0])
    except:
        return None

    messages = []
    for msg in data.get('messages', []):
        body = extract_text_body(msg.get('payload', {}))
        if not body or len(body.strip()) < 10:
            continue

        from_raw = get_header(msg, 'From')
        from_name, from_email = parse_from(from_raw)
        date_ms = int(msg.get('internalDate', 0))
        date_str = datetime.fromtimestamp(date_ms / 1000, tz=timezone.utc).isoformat() if date_ms else ''

        messages.append({
            'from': from_raw,
            'fromName': from_name,
            'fromEmail': from_email,
            'date': date_str,
            'body': body,
            'subject': get_header(msg, 'Subject')
        })

    del data
    gc.collect()
    return messages


# ═══════════════════════════════════════════════════════════════════════
#  Chunking & Embedding
# ═══════════════════════════════════════════════════════════════════════

def split_long_text(text, max_chars=28000, overlap=200):
    """Split long text into sub-chunks with overlap, breaking at paragraph/sentence boundaries."""
    if len(text) <= max_chars:
        return [text]
    chunks = []
    pos = 0
    while pos < len(text):
        end = min(pos + max_chars, len(text))
        if end < len(text):
            # Try to break at paragraph, then sentence, then word boundary
            search_start = pos + int(max_chars * 0.7)
            sub = text[search_start:end]
            # Paragraph break
            br = sub.rfind('\n\n')
            if br >= 0:
                end = search_start + br + 2
            else:
                # Sentence break
                for sep in ['. ', '! ', '? ', '.\n']:
                    br = sub.rfind(sep)
                    if br >= 0:
                        end = search_start + br + len(sep)
                        break
                else:
                    # Word boundary
                    br = sub.rfind(' ')
                    if br >= 0:
                        end = search_start + br + 1
        chunks.append(text[pos:end])
        pos = end - overlap if end < len(text) else end
    return chunks


def chunk_email_thread(thread_id, subject, messages, meta):
    """Convert email messages into chunks for embedding.
    Long messages are split into sub-chunks to stay within
    the embedding model's 8192 token limit."""
    MAX_BODY = 15000  # ~5000 tokens — conservative for URL-heavy content
    chunks = []
    for i, msg in enumerate(messages):
        date_short = msg['date'][:10] if msg['date'] else ''
        from_label = msg['fromName'] or msg['fromEmail'] or 'Unknown'

        base_title = f"{subject} - {from_label} ({date_short})" if date_short else f"{subject} - {from_label}"
        header = f"From: {msg['from']}\nDate: {msg['date']}\nSubject: {subject}\n\n"
        body = msg['body'] or ''

        if len(body) <= MAX_BODY:
            chunks.append({
                'title': base_title[:200],
                'content': header + body,
                'meta': meta,
                'people': [msg['fromName']] if msg['fromName'] else []
            })
        else:
            # Split long body into sub-chunks
            body_parts = split_long_text(body, MAX_BODY, 200)
            for ci, part in enumerate(body_parts):
                part_title = base_title + (f' (Part {ci+1})' if len(body_parts) > 1 else '')
                chunks.append({
                    'title': part_title[:200],
                    'content': header + part,
                    'meta': meta,
                    'people': [msg['fromName']] if msg['fromName'] else []
                })
    return chunks


def embed_chunks(chunks):
    """Embed chunk contents via OpenAI. Returns (embeddings_list, total_tokens)."""
    all_embeddings = []
    total_tokens = 0

    for si in range(0, len(chunks), 20):
        sub = [c['content'] for c in chunks[si:si+20]]
        _, resp = curl('https://api.openai.com/v1/embeddings', method='POST',
                       data={'model': EMBED_MODEL, 'input': sub},
                       hdrs={'Authorization': f'Bearer {OAI}', 'Content-Type': 'application/json'})

        if not isinstance(resp, dict) or 'data' not in resp:
            raise Exception(f'OpenAI error: {str(resp)[:200]}')

        total_tokens += resp.get('usage', {}).get('total_tokens', 0)
        all_embeddings.extend([d['embedding'] for d in resp['data']])
        del resp
        gc.collect()

    return all_embeddings, total_tokens


def store_thread_chunks(thread_id, subject, chunks, embeddings, total_tokens):
    """Store chunks and source tracking in Supabase."""
    stored = 0
    tpc = total_tokens // len(chunks) if chunks else 0

    for ci, ch in enumerate(chunks):
        emb_str = '[' + ','.join(str(x) for x in embeddings[ci]) + ']'
        m = ch.get('meta', {})

        row = {
            'user_id': UID,
            'source_type': 'email',
            'source_id': thread_id,
            'chunk_index': ci,
            'title': ch['title'],
            'content': ch['content'],
            'client_id': m.get('client_id'),
            'end_client': m.get('end_client', ''),
            'campaign_id': m.get('campaign_id'),
            'date': m.get('date'),
            'people': ch.get('people', []),
            'tags': [],
            'embedding': emb_str,
            'embedding_model': EMBED_MODEL,
            'token_count': tpc,
            'content_hash': hashlib.sha256(ch['content'].encode()).hexdigest(),
            'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        }

        s, _ = curl(f'{SUPABASE_URL}/rest/v1/knowledge_chunks', method='POST', data=row, hdrs=SBP)
        if 200 <= s < 300:
            stored += 1
        del emb_str, row

    # Source tracking
    curl(f'{SUPABASE_URL}/rest/v1/knowledge_sources', method='POST', data={
        'user_id': UID,
        'source_type': 'email',
        'source_id': thread_id,
        'name': (subject or 'No subject')[:200],
        'status': 'complete',
        'chunks_count': stored,
        'tokens_used': total_tokens,
        'error_message': '',
        'last_ingested_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    }, hdrs=SBP)

    return stored


# ═══════════════════════════════════════════════════════════════════════
#  Main
# ═══════════════════════════════════════════════════════════════════════

def main():
    print('=' * 55)
    print('  TaskFlow - Embed Email Threads')
    print('=' * 55, flush=True)

    if not SK:
        print('  Set SUPABASE_SERVICE_KEY env var')
        sys.exit(1)
    if not OAI:
        print('  Set OPENAI_API_KEY env var')
        sys.exit(1)

    # Load Gmail credentials
    print('\n  Loading Gmail credentials...', flush=True)
    load_gmail_credentials()

    # Test token is valid
    ensure_gmail_token()

    # Discover threads
    if args.from_gmail:
        # Pull thread IDs directly from Gmail API
        # If --limit is set and small, only discover what we need (+ buffer for already-embedded)
        discover_max = 0  # 0 = all
        if args.limit > 0 and args.limit <= 500:
            discover_max = args.limit + 200  # Extra buffer for skipping already-embedded
        print(f'\n  Discovering threads from Gmail API{"" if discover_max == 0 else f" (max {discover_max})"}...', flush=True)
        gmail_thread_ids = discover_all_gmail_threads(max_threads=discover_max)
        print(f'  Found {len(gmail_thread_ids)} threads in Gmail', flush=True)

        # Convert to the same format as gmail_threads table rows
        # CRM metadata will be looked up in batches during processing
        thread_ids = [{'thread_id': tid, 'subject': None, 'client_id': None,
                       'end_client': '', 'campaign_id': None, 'last_message_at': None}
                      for tid in gmail_thread_ids]
        del gmail_thread_ids
    else:
        # Use existing gmail_threads table
        print('\n  Loading thread IDs from gmail_threads...', flush=True)
        thread_ids = []
        offset = 0
        client_filter = '&client_id=not.is.null' if args.client_only else ''

        while True:
            _, batch = curl(
                f'{SUPABASE_URL}/rest/v1/gmail_threads?select=thread_id,subject,client_id,end_client,campaign_id,last_message_at'
                f'&user_id=eq.{UID}{client_filter}'
                f'&order=last_message_at.desc'
                f'&limit=1000&offset={offset}',
                hdrs=SB
            )
            if not isinstance(batch, list):
                print(f'  Failed to load threads: {batch}')
                sys.exit(1)

            for t in batch:
                thread_ids.append(t)
            if len(batch) < 1000:
                break
            offset += 1000

    print(f'  Found {len(thread_ids)} threads', flush=True)

    # Check already embedded
    print('  Checking existing embeddings...', flush=True)
    embedded = set()
    offset = 0
    while True:
        _, batch = curl(
            f'{SUPABASE_URL}/rest/v1/knowledge_sources?select=source_id'
            f'&user_id=eq.{UID}&source_type=eq.email&status=eq.complete'
            f'&limit=1000&offset={offset}',
            hdrs=SB
        )
        if not isinstance(batch, list):
            break
        for r in batch:
            embedded.add(r['source_id'])
        if len(batch) < 1000:
            break
        offset += 1000

    print(f'  Already embedded: {len(embedded)}', flush=True)

    to_embed = [t for t in thread_ids if t['thread_id'] not in embedded]
    del thread_ids
    gc.collect()

    # Apply offset/limit
    if args.offset > 0:
        to_embed = to_embed[args.offset:]
    if args.limit > 0:
        to_embed = to_embed[:args.limit]

    print(f'  To embed: {len(to_embed)}', flush=True)

    if not to_embed:
        print('\n  Nothing to do!')
        return

    est_minutes = len(to_embed) * 0.7 / 60  # ~0.7s per thread (Gmail fetch + embed + store)
    print(f'  Estimated time: ~{est_minutes:.0f} min', flush=True)

    # Pre-load CRM metadata in batches when using --from-gmail
    crm_cache = {}
    if args.from_gmail:
        print('  Loading CRM metadata from gmail_threads...', flush=True)
        tids_to_lookup = [t['thread_id'] for t in to_embed]
        for bi in range(0, len(tids_to_lookup), 50):
            batch_ids = tids_to_lookup[bi:bi+50]
            crm_batch = lookup_crm_metadata(batch_ids)
            crm_cache.update(crm_batch)
        print(f'  Found CRM data for {len(crm_cache)} / {len(to_embed)} threads', flush=True)
        del tids_to_lookup

    # Process
    total_chunks = 0
    total_tokens = 0
    errors = 0
    skipped = 0
    start_time = time.time()

    for i, thread in enumerate(to_embed):
        tid = thread['thread_id']

        # Merge CRM metadata if available
        if tid in crm_cache:
            crm = crm_cache[tid]
            if not thread.get('subject'):
                thread['subject'] = crm.get('subject')
            if not thread.get('client_id'):
                thread['client_id'] = crm.get('client_id')
            if not thread.get('end_client'):
                thread['end_client'] = crm.get('end_client', '')
            if not thread.get('campaign_id'):
                thread['campaign_id'] = crm.get('campaign_id')
            if not thread.get('last_message_at'):
                thread['last_message_at'] = crm.get('last_message_at')

        subj = thread.get('subject', 'No subject') or 'No subject'

        try:
            # Fetch from Gmail
            messages = fetch_thread_messages(tid)

            if messages is None:
                errors += 1
                print(f'  [{i+1}/{len(to_embed)}] GMAIL ERROR | {subj[:50]}', flush=True)
                time.sleep(1)
                continue

            if not messages:
                skipped += 1
                # Still mark as "complete" so we don't retry empty threads
                curl(f'{SUPABASE_URL}/rest/v1/knowledge_sources', method='POST', data={
                    'user_id': UID, 'source_type': 'email', 'source_id': tid,
                    'name': subj[:200], 'status': 'complete', 'chunks_count': 0,
                    'tokens_used': 0, 'error_message': 'no_content',
                    'last_ingested_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
                }, hdrs=SBP)
                continue

            # Get subject from messages if we don't have it (--from-gmail mode)
            if subj == 'No subject' and messages:
                msg_subj = messages[0].get('subject', '')
                if msg_subj:
                    subj = msg_subj

            # Chunk
            meta = {
                'client_id': thread.get('client_id'),
                'end_client': thread.get('end_client', ''),
                'campaign_id': thread.get('campaign_id'),
                'date': thread.get('last_message_at')
            }
            chunks = chunk_email_thread(tid, subj, messages, meta)

            if not chunks:
                skipped += 1
                continue

            # Embed
            embeddings, tok = embed_chunks(chunks)

            # Store
            stored = store_thread_chunks(tid, subj, chunks, embeddings, tok)

            total_chunks += stored
            total_tokens += tok

            del messages, chunks, embeddings
            gc.collect()

            # Progress every 25 threads or on first
            if (i + 1) % 25 == 0 or i == 0:
                pct = round((i + 1) / len(to_embed) * 100)
                elapsed = time.time() - start_time
                rate = (i + 1) / elapsed if elapsed > 0 else 0
                remaining = (len(to_embed) - i - 1) / rate / 60 if rate > 0 else 0
                print(f'  [{i+1}/{len(to_embed)} = {pct}%] {stored}ch {tok}tok | '
                      f'Total: {total_chunks}ch {total_tokens}tok | '
                      f'~{remaining:.0f}min left | {subj[:35]}', flush=True)

            # Rate limit: stay within Gmail quotas (~2 req/sec)
            time.sleep(0.5)

        except Exception as e:
            errors += 1
            print(f'  [{i+1}/{len(to_embed)}] ERROR: {e} | {subj[:50]}', flush=True)
            time.sleep(1)

    elapsed = time.time() - start_time
    print('\n' + '=' * 55)
    print(f'  Done!')
    print(f'  Threads:  {len(to_embed)} ({len(to_embed) - skipped - errors} with content)')
    print(f'  Chunks:   {total_chunks}')
    print(f'  Tokens:   {total_tokens}')
    print(f'  Cost:     ${total_tokens * 0.02 / 1_000_000:.4f}')
    print(f'  Skipped:  {skipped} (empty)')
    print(f'  Errors:   {errors}')
    print(f'  Time:     {elapsed/60:.1f} min')
    print('=' * 55)


if __name__ == '__main__':
    main()
