# TaskFlow — Project Guide for Claude Code

## What is TaskFlow?

TaskFlow is a comprehensive task management and business operations platform built for Tim Jarvis, who runs two LLCs:
- **Tim Jarvis Online LLC** — banking via Brex
- **Film&Content LLC** — banking via Mercury, accounting via Zoho Books, payment processing via Zoho Payments

It manages tasks, projects, campaigns, opportunities, clients, finance, and daily scheduling in a single-page app.

## Architecture

**100% client-side SPA** — no build step, no framework, no bundler. Vanilla JavaScript with a global state object `S` and string-based DOM rendering.

```
Browser (client JS)                   Vercel Serverless Functions
┌─────────────────────┐              ┌──────────────────────────────┐
│ index.html          │              │ api/_lib/        (shared)    │
│ js/config.js        │──settings──▶ │ api/settings/    (credentials)│
│ js/core.js          │──sync─────▶  │ api/sync/        (per-platform)│
│ js/views.js         │              │ api/cron/        (periodic)   │
│ js/modals.js        │              │ api/webhook/     (real-time)  │
│ js/features.js      │              └──────────┬───────────────────┘
│ js/app.js           │                         │ service role key
│ css/core.css        │                         ▼
│ css/components.css  │  ◀──anon key + RLS──▶  Supabase
│ css/features.css    │                         (PostgreSQL + Auth)
└─────────────────────┘
```

**Key stack:**
- **Frontend**: Vanilla JS SPA, Chart.js for analytics, Inter font
- **Backend**: Supabase (PostgreSQL with RLS, Auth, REST API via PostgREST)
- **Hosting**: Vercel (Hobby plan — 60s max function timeout, no cron support)
- **CDN libs**: Supabase JS v2 (UMD), Chart.js 4.4

## Important URLs & IDs

| Item | Value |
|------|-------|
| Live URL | https://taskflow.timjarvis.online |
| GitHub repo | https://github.com/timjarvisonline1/taskflow (main branch) |
| Supabase project | https://tnkmxmlgdhlgehlrbxuf.supabase.co |
| Supabase anon key | In `js/config.js` |
| Vercel project | prj_x4bxGyfWol5K7pjJZOmSgV75NCx0 |
| User UUID | 78bd1255-f05a-436b-abbd-f8c281d30210 |

**Environment variables** (set in Vercel dashboard, never in code):
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_KEY` — service role key (bypasses RLS)
- `CRON_SECRET` — random string for cron job auth

## File Structure

```
taskflow/
├── index.html              # Main SPA shell (sidebar, main area, mobile nav)
├── login.html              # Auth page (Supabase email/password)
├── package.json            # Minimal — only @supabase/supabase-js for serverless
├── vercel.json             # API rewrites, SPA fallback, function config
├── CLAUDE.md               # This file
│
├── js/
│   ├── config.js           # Supabase client init, CONFIG object
│   ├── core.js             # State (S), data loading, CRUD helpers, timers, filters
│   ├── views.js            # All view rendering (rDash, rToday, rTasks, rFinance, etc.)
│   ├── modals.js           # All modal UIs (detail, add, done, campaigns, finance, integrations)
│   ├── features.js         # Focus mode, command palette, drag & drop, scheduling
│   └── app.js              # TF function registry (window.TF = {...})
│
├── css/
│   ├── core.css            # CSS variables, layout, sidebar, typography
│   ├── components.css      # Cards, badges, buttons, forms, tables
│   └── features.css        # Finance, campaigns, projects, opportunities, modals
│
├── api/
│   ├── _lib/
│   │   ├── supabase.js     # Service client, auth verification, upsertPayment, applyPayerMap
│   │   ├── zoho-auth.js    # OAuth token refresh + code exchange for Zoho
│   │   ├── sync-brex.js    # Brex transaction sync (polling, no date filter)
│   │   ├── sync-mercury.js # Mercury transaction sync (polling + webhook processing)
│   │   ├── sync-zoho-books.js    # Zoho Books sync (invoices, payments, bills, expenses)
│   │   └── sync-zoho-payments.js # Zoho Payments sync (payments + payouts)
│   ├── sync/
│   │   ├── brex.js         # POST /api/sync/brex — triggers Brex sync
│   │   ├── mercury.js      # POST /api/sync/mercury — triggers Mercury sync
│   │   ├── zoho-books.js   # POST /api/sync/zoho-books — triggers Zoho Books sync
│   │   ├── zoho-payments.js # POST /api/sync/zoho-payments — triggers Zoho Payments sync
│   │   └── cleanup-duplicates.js # POST — one-time cleanup of duplicate records
│   ├── settings/
│   │   ├── credentials.js  # GET/POST/DELETE integration credentials
│   │   └── test-connection.js # POST — test a platform connection
│   ├── cron/
│   │   └── sync-all.js     # Periodic sync for all active integrations
│   └── webhook/
│       ├── mercury.js      # Mercury webhook (HMAC-SHA256 verified)
│       └── zoho-payments.js # Zoho Payments webhook
│
├── supabase/
│   ├── schema.sql          # Main schema (tasks, done, review, clients, campaigns, etc.)
│   ├── add-finance.sql     # finance_payments, payer_client_map tables
│   ├── add-finance-splits.sql  # finance_payment_splits table
│   ├── add-finance-integrations.sql # integration_credentials, sync_log tables
│   ├── add-activity-logs.sql   # activity_logs table
│   └── add-meeting-key.sql     # meeting_key column on tasks
│
└── scripts/
    └── run-migration.py    # Helper to run SQL migrations
```

## Client-Side Architecture

### Global State Object `S`

All app state lives in `window.S`, populated by `loadData()`:

```javascript
S = {
  // Data arrays (from Supabase)
  tasks: [],              // Active tasks
  done: [],               // Completed tasks
  review: [],             // Review queue items
  clients: [],            // Client name strings (legacy)
  clientRecords: [],      // Full client objects {id, name, status, email, ...}
  campaigns: [],          // Campaign objects
  projects: [],           // Project objects
  phases: [],             // Project phase objects
  opportunities: [],      // Sales opportunity objects
  payments: [],           // Campaign payment records
  campMeetings: [],       // Campaign meeting records
  actLogs: {},            // Activity logs by task ID
  financePayments: [],    // Finance payment records
  finSplits: [],          // Payment split records
  payerMap: [],           // Payer-to-client mappings
  integrations: [],       // Integration credential records

  // UI state
  view: 'dash',           // Current view (dash, today, tasks, finance, etc.)
  filters: {},            // Task filters
  collapsed: {},          // Collapsed sections
  layout: 'board',        // Task layout (board, list)
  groupBy: 'importance',  // Task grouping
  timers: {},             // Active timers by task ID
  pins: {},               // Pinned tasks

  // Finance filters
  finFilter: '',          // '' | 'unmatched' | 'matched' | 'split'
  finDirection: '',       // '' | 'inflow' | 'outflow'
  finSearch: '',          // Search text
  finRange: '12m',        // Analytics range
  finShowAnalytics: true, // Show/hide analytics
}
```

### Rendering Pattern

All views are rendered by calling `render()`, which calls the appropriate `rXxx()` function based on `S.view`. Views build HTML strings and inject via `innerHTML`. No virtual DOM.

```
render() → rDash() | rToday() | rTasks() | rFinance() | rCampaigns() | ...
```

### Function Registry

All functions callable from HTML `onclick` handlers are registered on `window.TF`:

```javascript
window.TF = { nav, load, start, pause, openDetail, ... }
```

HTML uses: `onclick="TF.openDetail('task-id')"`, `onchange="TF.filt('client', this.value)"`, etc.

### Key Helpers

- `gel(id)` — `document.getElementById(id)`
- `cel(tag, cls, html)` — create element
- `esc(str)` — HTML-escape
- `icon(name, size)` — Lucide SVG icon
- `today()` — today as YYYY-MM-DD
- `fmtT(seconds)` — format timer as H:MM:SS
- `toast(msg, type)` — show notification ('ok', 'info', 'warn', 'err')

## Finance System

### Payment Lifecycle

Payments flow through these states:
- **unmatched** — new payment, needs client association
- **matched** — associated with a client (and optionally campaign/end client)
- **split** — split across multiple clients/campaigns
- **excluded** — intentionally excluded (e.g., pre-existing records already handled)

### Unmatched View (Client Matching)

The Unmatched tab shows only records that need client association. It filters to:
- `status === 'unmatched'`
- `direction === 'inflow'`
- `type === 'payment'`
- `source !== 'zoho_books'` (always duplicates Zoho Payments or Mercury)
- `source !== 'brex'` (internal business banking, not client payments)

**Deduplication logic:** A single real-world customer payment creates records in multiple sources:
- Credit card payment: Zoho Payments (authoritative) + Zoho Books customer payment (duplicate)
- Bank transfer: Mercury (authoritative) + Zoho Books customer payment (duplicate)

Therefore Zoho Books records are excluded from client matching entirely. They still exist in the database for cash flow forecasting and accounting reconciliation.

Sources eligible for client matching: `zoho_payments`, `mercury`, `stripe`, `stripe2`, `zoho` (legacy CSV).

### Data Sources

| Source | Platform | Auth | Direction |
|--------|----------|------|-----------|
| `brex` | Brex API | Bearer token | Both (positive=inflow, negative=outflow) |
| `mercury` | Mercury API | Bearer secret-token | Both |
| `zoho_books` | Zoho Books API | OAuth 2.0 | Invoices/customer payments=inflow, vendor payments/bills/expenses=outflow |
| `zoho_payments` | Zoho Payments API | OAuth 2.0 | Payments=inflow, payouts=inflow (funds to bank) |
| `stripe` | CSV import (legacy) | N/A | Inflow |
| `stripe2` | CSV import (legacy) | N/A | Inflow |
| `zoho` | CSV import (legacy) | N/A | Inflow |

### Record Types

- `payment` — actual money movement (these are what users match to clients)
- `invoice` — money owed to us (Zoho Books)
- `bill` — money we owe (Zoho Books)
- `expense` — direct expense (Zoho Books)
- `transfer` — inter-account transfer (Brex)
- `payout` — funds disbursed to bank (Zoho Payments)

### upsertPayment Behavior

In `api/_lib/supabase.js`, the `upsertPayment` function:
1. Checks for existing record by `source + source_id`
2. If exists: updates sync-safe fields (amount, fee, date, external_status, etc.) — but **never** overwrites `status` or `client_id` (preserves user's matched state)
3. **Cross-source duplicate check**: before inserting, checks if a record with the same `date + amount` (±$0.01) already exists from a **different** source. If so, returns `{ action: 'skipped' }` — this prevents Zoho Payments from re-creating records already imported via CSV (where `source='zoho'` vs `source='zoho_payments'`)
4. If new: checks `payer_client_map` for auto-matching, then inserts

### Cleanup Endpoint

`POST /api/sync/cleanup-duplicates` — one-time cleanup tool (button in Integrations modal):
1. Deletes all live-source records (zoho_books, zoho_payments, mercury) dated before 2026-02-28 (CSV cutoff)
2. Cross-source duplicate removal: deletes live-source records matching CSV records by date+amount (any date)
3. Deletes null-date live-source records matching CSV records by amount alone
4. Deduplicates Brex records (same date+amount), keeping the matched version
5. Marks remaining pre-cutoff unmatched records as 'excluded'
6. Restores 'matched' status on records that have client_id but status='unmatched'

### API Integration Details

**Brex:**
- Base: `https://platform.brexapis.com`
- Auth: `Authorization: Bearer {api_key}`
- Amounts in **cents** (divide by 100)
- `posted_at_start` parameter causes 400 — don't use it, rely on upsert dedup
- Cursor-paginated

**Mercury:**
- Base: `https://api.mercury.com/api/v1`
- Auth: `Authorization: Bearer secret-token:{api_key}`
- Webhook: HMAC-SHA256 via `Mercury-Signature` header

**Zoho Books:**
- Base: `https://www.zohoapis.com/books/v3`
- Auth: `Authorization: Zoho-oauthtoken {access_token}` + `?organization_id=899890816`
- OAuth via Self Client flow (shared with Zoho Payments)
- Rate limit: 100 req/min — 700ms delay between calls
- `/expenses` endpoint does NOT support `sort_column=last_modified_time` — use `date` instead
- Scopes: `ZohoBooks.settings.READ,ZohoBooks.invoices.READ,ZohoBooks.customerpayments.READ,ZohoBooks.vendorpayments.READ,ZohoBooks.bills.READ,ZohoBooks.expenses.READ`
- Organization ID: `899890816` (Film&Content LLC)

**Zoho Payments:**
- Base: `https://payments.zoho.com/api/v1`
- Auth: `Authorization: Zoho-oauthtoken {access_token}` + `?account_id={id}`
- Scope prefix: `ZohoPay` (not `ZohoPayments`)
- Scopes: `ZohoPay.payments.READ,ZohoPay.payouts.READ`
- Amounts in **dollars** (not cents — do NOT divide by 100)
- Date fields may return Unix timestamps (epoch seconds like `1772277589`) — use `parseDate()` helper in sync-zoho-payments.js to handle all formats

**Zoho OAuth (both):**
- Token endpoint: `https://accounts.zoho.com/oauth/v2/token`
- Self Client: ONE per Zoho account, shared between Books and Payments
- Code exchange gives refresh_token + access_token
- Refresh token is long-lived; access token expires in 1 hour

## Database Tables

### Core Tables
- `tasks` — active tasks with due dates, importance, client, campaign, project associations
- `done` — completed tasks (moved from tasks on completion)
- `review` — items to review/approve before becoming tasks
- `clients` — client/partner records
- `campaigns` — marketing campaign records with fees, dates, links
- `projects` — project records with phases
- `project_phases` — ordered phases within projects
- `opportunities` — sales pipeline items
- `payments` — campaign-related payment records
- `campaign_meetings` — meeting records linked to campaigns
- `activity_logs` — per-task log entries

### Finance Tables
- `finance_payments` — all financial transactions from all sources
- `finance_payment_splits` — split payment allocations
- `payer_client_map` — auto-matching rules (payer email/name → client)
- `integration_credentials` — API keys and OAuth tokens per platform
- `sync_log` — audit trail for all sync operations

All tables have RLS policies: users can only read/write their own data.

## Deployment

- **Automatic**: Push to `main` branch → Vercel builds and deploys
- **Manual sync functions**: Triggered via UI "Sync Now" buttons
- **Cron**: Vercel Hobby plan doesn't support crons. Use external scheduler (cron-job.org) to call `POST /api/cron/sync-all` with `Authorization: Bearer {CRON_SECRET}`

## Coding Conventions

1. **No frameworks** — vanilla JS only, no React/Vue/etc.
2. **No build step** — files served as-is
3. **Global state** — everything on `S` object
4. **String HTML** — views build HTML strings, not DOM nodes
5. **Semicolons optional** — code uses semicolons inconsistently (ok either way)
6. **Function names** — camelCase, registered on `window.TF` for HTML access
7. **CSS variables** — defined in `css/core.css` (--t1, --t2, --bg, --green, --red, etc.)
8. **No TypeScript** — all vanilla JS
9. **API endpoints** — CommonJS modules, `module.exports = async function handler(req, res)`
10. **Supabase client-side** — uses `_sb` global from config.js (anon key + RLS)
11. **Supabase server-side** — uses `getServiceClient()` from `api/_lib/supabase.js` (service key, bypasses RLS)

## Common Tasks

### Adding a new view
1. Add render function `rNewView()` in `views.js`
2. Add navigation case in `render()` function in `core.js`
3. Add nav item in `buildNav()` in `views.js`

### Adding a new modal
1. Add function in `modals.js` that builds HTML and sets `gel('m-body').innerHTML`
2. Register in `window.TF` in `app.js`

### Adding a new API endpoint
1. Create file in appropriate `api/` subdirectory
2. Export `async function handler(req, res)`
3. Use `verifyUserToken(req)` for auth
4. Use `getServiceClient()` for DB access
5. Call `cors(res)` and handle OPTIONS

### Adding a new integration
1. Create `api/_lib/sync-{platform}.js` with core sync logic
2. Create `api/sync/{platform}.js` HTTP handler
3. Add to `api/cron/sync-all.js`
4. Add platform config in `INTG_PLATFORMS` array in `modals.js`
5. Add source badge color in `css/features.css`

## Sync Behavior

### Incremental vs Full Sync
- **Zoho Books**: Uses `last_sync_at` for date filtering. If `last_sync_message` starts with "0 new, 0 updated", treats as first sync (no date filter) to recover from failed initial syncs
- **Zoho Payments**: Always fetches all records, relies on upsert dedup + cross-source skip
- **Brex**: Always fetches all records, relies on upsert dedup (no `posted_at_start` — causes 400)
- **Mercury**: Uses `last_sync_at` or defaults to 90 days ago

### Cross-Source Deduplication
A single real-world payment creates records in multiple sources. The system handles this at two levels:
1. **upsertPayment** prevents future duplicates by checking date+amount across sources before insert
2. **cleanup-duplicates** endpoint removes existing duplicates retroactively
3. **Unmatched view** excludes `zoho_books` and `brex` sources entirely (only shows `zoho_payments`, `mercury`, and legacy CSV sources)

### CSV Data Cutoff
All CSV-imported data covers up to 2026-02-28. Live sync data starts from this date. The cleanup endpoint uses this cutoff to identify and remove duplicates.

## Known Quirks

- Brex `posted_at_start` parameter causes 400 errors — removed entirely
- Zoho Books `/expenses` doesn't support `sort_column=last_modified_time` — use `date` instead
- Zoho Payments date fields return Unix timestamps (epoch seconds) — `parseDate()` helper handles conversion
- Zoho's Self Client generates a ONE-TIME auth code — must be exchanged within 10 minutes
- Test Connection endpoint merges stored credentials with form fields — no need to re-enter everything
- Toast messages last 8s for errors, 3.2s for success
- `vercel.json` maxDuration only applies to `api/sync/*.js` (60s)
- CSV-imported records use source names `stripe`, `stripe2`, `zoho`, `brex` while live sync uses `zoho_books`, `zoho_payments`, `mercury`, `brex`

## Current Status (as of 2026-03-02)

### Integrations
- **Brex**: Connected, syncing ~308 transactions
- **Mercury**: Connected, syncing
- **Zoho Books**: Connected, syncing (orgId 899890816 — Film&Content LLC)
- **Zoho Payments**: Connected, syncing ~69 records

### What's Working
- All four platforms sync via "Sync Now" buttons
- Cross-source duplicate prevention on insert
- Unmatched view filters to only actionable customer payments
- Cleanup endpoint removes historical duplicates
- Test Connection works without re-entering stored credentials

### Next Steps
- Set up external cron scheduler (cron-job.org) for automatic 15-minute syncs
- Build cash flow forecasting feature using all synced financial data
