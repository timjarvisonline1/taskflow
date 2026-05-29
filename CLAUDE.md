# TaskFlow — Project Guide

## What is TaskFlow?

A focused single-user business operations app for Tim Jarvis. Built around four jobs:

1. **Stay on top of work** — tasks tied to clients, campaigns, end-clients, opportunities
2. **See the day clearly** — suggested order + today's timeline (no more 7 schedule sub-views)
3. **Know your cash position** — live bank balances + manual invoices + recurring outgoings + 90-day forecast
4. **Capture meetings** — Read.ai webhook auto-ingests transcripts, summaries, action items

Plus a global **Ask TaskFlow** AI panel that draws on emails, meetings, and CRM entities via a pgvector knowledge base.

## Architecture

Vanilla-JS SPA, no build step, no framework. Global state object `S`, string-based HTML rendering. Backend is Vercel serverless functions; data in Supabase (Postgres + Auth + pgvector).

```
Browser (client JS)                   Vercel Serverless Functions
┌─────────────────────┐              ┌──────────────────────────────┐
│ index.html          │              │ api/_lib/          shared    │
│ js/config.js        │──auth──────▶ │ api/auth/          OAuth     │
│ js/core.js          │──sync──────▶ │ api/sync/          (brex/mer/gm)│
│ js/views.js         │──ask───────▶ │ api/knowledge/     RAG       │
│ js/modals.js        │──webhook ──▶ │ api/webhook/       (readai/merc)│
│ js/features.js      │              │ api/meetings/      reports   │
│ js/app.js           │              │ api/gmail/         search    │
│ css/*               │              │ api/settings/      creds     │
└─────────────────────┘              └──────────┬───────────────────┘
                                                ▼
                                     Supabase (Postgres + pgvector + Auth)
```

## Sections (nav order)

| # | ID | Label | Notes |
|---|-----|-------|------|
| 1 | `dashboard` | Dashboard | Today's focus + weekly/monthly summary + KPIs |
| 2 | `today` | Schedule | Two modes: Suggested order, Today's timeline |
| 3 | `tasks` | Tasks | Open / Completed / Review / Quick Add |
| 4 | `opportunities` | Sales | One unified pipeline + "needs attention" surface |
| 5 | `campaigns` | Campaigns | Existing campaigns view (legacy sub-views hidden) |
| 6 | `projects` | Initiatives | Flat list of bigger-picture work, tasks linked to one |
| 7 | `clients` | Clients | Stale-relationships table + End Clients |
| 8 | `finance` | Finance | Overview, Invoices, Recurring, Forecast |
| 9 | `email` | Email Search | Read-only search of indexed Gmail threads |
| 10 | `meetings` | Meetings | Read.ai ingested meetings, AI task suggestions |
| 11 | `ai` | Ask TaskFlow | Global AI Q&A over emails / meetings / CRM |

## What was removed (May 2026 simplification)

- **Outreach (Instantly.ai)** — full section, 8 tables, 10 API endpoints, webhook handler
- **Website Analytics (GA4)** — full section, service account auth, polling
- **Email UI** — compose, AI drafts, smart inboxes, rules engine, scheduled send, Action Required, batch archive, quick replies, summarization, AI analysis, Zapier flow
- **Prospects sub-section** — folded into Sales (no separate UI)
- **Clients sub-views** — Active/Lapsed/People/Contact Review removed; one stale-relationships view replaces them. End Clients kept.
- **Schedule sub-views** — Meeting Prep, Analytics, Daily Summary, Weekly Summary, Weekly Capacity all removed. Only Suggested order + Day timeline remain.
- **Finance sub-views** — Transactions, Upcoming, Team removed. Cross-source dedup, expense reconciliation, splits, payer-client map dropped.
- **Per-entity AI boxes** — replaced by the single global "Ask TaskFlow" panel
- **Zoho Books + Zoho Payments sync** — both gone (manual invoice entry now)

Dead JS function bodies still exist in `views.js`, `modals.js`, and `core.js` as zombies. They aren't called by anything live. They can be pruned over time, but they're safe.

Tables to drop manually: see `supabase/drop-deprecated-2026-05.sql`.

## File structure

```
taskflow/
├── index.html              Main SPA shell
├── login.html              Supabase email/password auth
├── package.json            @anthropic-ai/sdk + @supabase/supabase-js
├── vercel.json             API function timeouts
├── CLAUDE.md               This file
│
├── js/
│   ├── config.js           Supabase client init, CONFIG
│   ├── core.js             State (S), data loading, CRUD, contacts, email sync
│   ├── views.js            All view renderers (rDashboard, rToday, rTasks, ...)
│   ├── modals.js           All modal UIs
│   ├── features.js         Focus mode, command palette, drag/drop, meeting auto-tracking
│   └── app.js              TF function registry (window.TF)
│
├── css/
│   ├── core.css            Variables, layout, sidebar
│   ├── components.css      Cards, badges, buttons, forms, tables
│   └── features.css        Section-specific styles (campaigns, meetings, ai box, etc.)
│
├── api/
│   ├── _lib/               supabase, gmail-auth, embeddings, entity-chunkers,
│   │                       sync-brex, sync-mercury, sync-gmail, analyze-meeting
│   ├── auth/               gmail-connect, gmail-callback (OAuth)
│   ├── gmail/              threads, thread, attachment, profile (read-only)
│   ├── knowledge/          search, ai-ask, ingest-{emails,meetings,document,url,youtube}, sync-entities, stats
│   ├── meetings/           generate-report (Kajabi)
│   ├── settings/           credentials, test-connection (brex/mercury/gmail/anthropic/openai)
│   ├── sync/               brex, mercury, gmail
│   └── webhook/            readai (with GET health check), mercury
│
├── supabase/
│   ├── schema.sql                       Base schema
│   ├── add-*.sql                        Historical migrations (still authoritative)
│   ├── drop-deprecated-2026-05.sql      ← Run this in Supabase to apply the cull
│   └── upgrade-knowledge-*.sql          KB hybrid search upgrade (already applied)
│
└── scripts/                  Bulk embed scripts (email/meeting/entity)
```

## Global state `S`

Populated by `loadData()`:

```js
S = {
  // Tasks
  tasks, done, review, timers, pins, actLogs, customOrder, schedOrder, projTaskOrder,
  templates, recurrLast, focusTask, focusDuration,
  filters, layout, groupBy, doneSort, bulkMode, bulkSelected,

  // CRM entities
  clients, clientRecords, endClients,
  campaigns, payments, campaignMeetings, campaignNotes, clientNotes,
  projects, phases,                // projects table reused for Initiatives
  opportunities, oppMeetings,
  contacts,
  meetings, meetingDetail, meetingSearch, meetingsPage, meetingFilter,

  // Finance
  accountBalances,                  // live from Brex + Mercury
  scheduledItems,                   // recurring outgoings
  invoices,                         // NEW: manual invoices
  financePayments, financePaymentSplits, payerMap,  // legacy data, still loaded
  integrations,
  forecastHorizon, forecastScenario,

  // Email (search-only)
  gmailThreads, gmailSearch, gmailUnread,

  // UI state
  view, subView, dashPeriod, collapsed,
  campaignTab, clientTab, endClientTab, opportunityTab,
  // calendar
  calEvents,

  // AI panel state lives on window._askHistory / window._askSourcesMap
}
```

## Rendering pattern

All view functions return HTML strings injected into `#main`. No virtual DOM. Top-level dispatcher is `render()` in `views.js`:

```js
LIVE_VIEWS = ['dashboard','today','tasks','opportunities','campaigns',
              'projects','clients','finance','email','meetings','ai']
```

If `S.view` is not in `LIVE_VIEWS` (e.g. stale `outreach` from localStorage), it falls back to `dashboard`.

## Key sections

### Finance (rebuilt)
- **Overview** (`rFinanceOverviewSimple`) — KPI strip + bank balance cards from `account_balances`
- **Invoices** (`rInvoicesView`) — manual entry, mark paid, simple table from `invoices` table
- **Recurring** (`rFinanceRecurring`) — existing scheduled_items
- **Forecast** (`rFinanceForecastSimple`) — 90-day day-by-day with running balance, lowest-point detection

### Initiatives (rebuilt from Projects)
- `rProjects()` renders flat card grid of `S.projects` (status ≠ Archived)
- Each card: name, status badge, target date countdown, task progress bar, overdue count
- Tasks link to one initiative via `task.project` column
- No more phases, board, list, timeline

### Tasks (detail page — rebuilt May 2026)
- `rTaskDetailPage()` in `views.js` (line ~91) — full page-detail view using `opd-*` section-card pattern
- Layout: **Details + Linked To** side-by-side (flex 3:2 ratio via `.td-top-cols`), **Notes + Activity Log** side-by-side below
- Timer/Add Time is integrated into the sticky `opd-actions` bar (no separate section)
- Importance chip uses `impCls()` (returns `bg-cr`/`bg-im`/`bg-mt`/`bg-wt`) — NOT `impBg()`/`impCol()` which don't exist
- Completing or deleting a task from the detail page clears `S._detailPage` and calls `_pushHash()` to navigate back (fixes in `modals.js` lines ~362/372 and `core.js` line ~402)
- CSS: `.td-top-cols` in `components.css` (flexbox, stacks below 768px), `.opd-actions-sep` divider

### Sales (simplified)
- `rOpportunities()` shows: KPIs → "Needs your attention" surface → per-type pipeline columns
- "Needs attention" criteria: no update in 14+ days, missing expected close, or past expected close while open
- One screen per type (Retain Live, F&C Partnerships, F&C Direct) — no separate sub-nav
- **Stage columns**: Empty stages are hidden when `S.opClientFilter` is set (line ~4447 in `views.js`)
- **Detail nav**: Left/right arrows scope to same `op.type` — counter reflects type-scoped count (line ~3694)

### Clients (stale-first)
- `rClientsStale()` — table sorted by days-since-last-contact, descending
- Heat dot: red ≥ 45 days, amber ≥ 14 days with active campaign, green otherwise
- Last contact = max(last email, last meeting, last completed task)
- Click a row → existing client detail modal (`openClientDetailModal`)
- End Clients sub-nav for managing end_client records

### Email Search (replacement for full Email UI)
- `rEmailSearch()` — text search across cached `gmail_threads` (subject, snippet, sender)
- Read-only. No compose, no AI features.
- Sync still runs (`/api/sync/gmail` → `api/_lib/sync-gmail.js`) keeping the KB fresh
- Click a thread → existing `openEmailThread()` opens it (still works because thread + attachment endpoints kept)

### Meetings
- `rMeetings()` + `rMeetingDetail()` — unchanged from before, except added "Webhook health" link in header pointing to `/api/webhook/readai` (GET)
- Read.ai webhook (`api/webhook/readai.js`) now:
  - Returns 401 on missing/wrong secret (was returning 200, silently swallowing)
  - Returns 500 on processing errors (Read.ai will retry)
  - Returns diagnostic JSON on GET
  - Logs each step to Vercel function logs
  - **Webhook re-enabled May 29, 2026** — had been stopped since ~April 7. URL: `https://taskflow.timjarvis.online/api/webhook/readai?secret=readai-taskflow-2026`. Secret confirmed matching DB.
  - **~7 weeks of meetings missed** (April 7 – May 29) — need backfill via Read.ai API sync

### Ask TaskFlow (global AI panel)
- `rAskTaskFlow()` — single text input, persisted conversation history, suggested prompts
- `askTaskflow()` → POSTs to `/api/knowledge/ai-ask` with last 6 turns as context
- History stored on `window._askHistory`, sources cached in `window._askSourcesMap`
- Survives view switches; cleared via "Clear conversation" button

### Knowledge Base (unchanged backend, single front-end consumer now)
- 53K+ emails, all meetings, and 10 entity types embedded via OpenAI text-embedding-3-large (1536 dims)
- Hybrid search: vector + tsvector + recency weighting + 50% source-diversity cap
- `match_knowledge()` SQL function with two-phase HNSW scan
- `startKnowledgeSync()` runs every 90 seconds in the background, embedding new entity changes

## Important URLs & IDs

| Item | Value |
|------|-------|
| Live URL | https://taskflow.timjarvis.online |
| GitHub repo | https://github.com/timjarvisonline1/taskflow (main branch) |
| Supabase project | https://tnkmxmlgdhlgehlrbxuf.supabase.co |
| Vercel project | prj_x4bxGyfWol5K7pjJZOmSgV75NCx0 |
| User UUID | 78bd1255-f05a-436b-abbd-f8c281d30210 |

Environment variables (Vercel dashboard): `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. Per-user API keys (Anthropic, OpenAI, Brex, Mercury, Read.ai secret) live in the `integration_credentials` table.

### Read.ai API (for planned sync integration)
- **Base URL**: `https://api.read.ai/v1/`
- **Auth**: OAuth 2.1 with dynamic client registration
- **Token endpoint**: `https://authn.read.ai/oauth2/token`
- **Scopes**: `openid email meeting:read offline_access profile`
- **Token lifetime**: Access tokens expire after 10 minutes; refresh tokens rotate on each use
- **Key endpoint**: `GET /v1/meetings?limit=N&start_time_ms.gte=TIMESTAMP` — lists meetings filtered by date, reverse chronological, paginated
- **Rate limit**: 100 requests/minute/user
- **MCP server**: Also available at `https://api.read.ai/mcp/` (configured in `~/.claude.json` as `readai` but not yet authenticated)

### Email sync (current state)
- **Polling only** — no Gmail push notifications/webhooks
- Sync runs when user opens Email section or clicks "Sync Now"
- `api/sync/gmail` → `api/_lib/sync-gmail.js` fetches up to 500 threads per sync
- Auto-embeds new threads into knowledge base (best-effort within 300s timeout)
- **Planned**: Scheduled 30-minute polling via Vercel cron or Claude Code routine

## Coding conventions

1. No build step. Files served as-is.
2. Vanilla JS, global `S`, string HTML.
3. CSS variables in `css/core.css` (--t1..--t4, --bg, --bg1, --green, --red, --blue, --purple50, --amber, --pink, --gborder, --r, --glass, --accent).
4. `window.TF.*` registry in `app.js` is what HTML onclick handlers call.
5. Modal pattern: `gel('m-body').innerHTML = h; gel('modal').classList.add('on')`.
6. CommonJS API endpoints: `module.exports = async function handler(req, res)`.
7. Client uses `_sb` (anon key + RLS). Server uses `getServiceClient()` (service key).

## Common tasks

### Adding a section
1. Add to `SECTIONS` array in `core.js`
2. Add to `LIVE_VIEWS` in `views.js` and a `case` in `render()`
3. Add `rNewView()` function in `views.js`

### Adding a CRUD entity (e.g. invoices)
1. SQL migration in `supabase/`
2. `loadXxxSafe()` loader in `core.js`, call from `loadData()`
3. `dbAddXxx`, `dbEditXxx`, `dbDeleteXxx` in `core.js`
4. Modal functions in `modals.js`
5. Register on `window.TF` in `app.js`

### Adding an API endpoint
1. File in `api/<group>/<name>.js`
2. `module.exports = async function handler(req, res)`
3. Use `cors(res)` and handle OPTIONS
4. Use `verifyUserToken(req)` for auth, `getServiceClient()` for DB
5. Add to `vercel.json` functions block if non-default timeout needed

## After deployment

Tim needs to:

1. **Run** `supabase/drop-deprecated-2026-05.sql` in the Supabase SQL editor to drop dead tables and create the new `invoices` table.
2. **Verify Read.ai webhook** by visiting `https://taskflow.timjarvis.online/api/webhook/readai` in a browser. Should return JSON showing `readai_integrations: 1, has_webhook_secret: 1`. If zero, set up the readai integration in `integration_credentials` with a `webhook_secret` in `config`.
3. **Check the Read.ai dashboard** webhook URL is `https://taskflow.timjarvis.online/api/webhook/readai?secret=YOUR_SECRET`. If it stopped working, the secret in the URL probably no longer matches the one in the DB.
4. **Hit "Sync Now"** in the integrations modal for Brex and Mercury to populate live balances.

## Planned: Read.ai API sync + meeting backfill

Build a Read.ai OAuth integration modelled on the existing Gmail OAuth pattern:

1. **OAuth flow**: `api/auth/readai-connect.js` (returns auth URL) + `api/auth/readai-callback.js` (exchanges code for tokens, stores in `integration_credentials`)
2. **Sync endpoint**: `api/sync/readai.js` + `api/_lib/sync-readai.js` — pulls meetings via `GET /v1/meetings`, upserts into `meetings` table, triggers AI task generation + KB embedding (same post-processing as the webhook handler)
3. **Backfill**: On first sync, pull all meetings since April 7, 2026 (`start_time_ms.gte=1743984000000`)
4. **UI**: Add "Connect Read.ai" button in integrations modal + "Sync Now" button (same pattern as Gmail/Brex/Mercury)
5. **Ongoing**: Acts as safety net alongside the webhook — catches any meetings the webhook misses

The Gmail OAuth pattern to follow:
- `api/auth/gmail-connect.js` — builds auth URL with scopes, returns it to frontend
- `api/auth/gmail-callback.js` — receives OAuth callback, exchanges code for tokens, stores credentials
- `api/_lib/gmail-auth.js` — helper to get/refresh access tokens from stored credentials
- `api/_lib/sync-gmail.js` — actual sync logic using the refreshed token

Read.ai differences from Gmail:
- OAuth 2.1 with **dynamic client registration** (must register client first, receives client_id + client_secret)
- Tokens expire every **10 minutes** (vs Gmail's 1 hour) — must refresh aggressively
- Refresh tokens **rotate** on each use (must store new refresh_token after each refresh)

## Planned: Daily task extraction routine

Long-term goal: auto-extract tasks from emails and meetings.

- **Meetings**: Extend the Read.ai webhook handler (or sync post-processing) to generate AI-suggested tasks. The `analyzeMeetingForTasks()` function in `api/_lib/analyze-meeting.js` already does this.
- **Emails**: After each Gmail sync, process new/unread threads through AI to extract action items. Needs a new `analyzeEmailForTasks()` function.
- **Review UI**: A "Suggested Tasks" queue in the Tasks section where AI-extracted tasks can be reviewed, merged, edited, accepted, or dismissed before becoming real tasks.
- **Notification**: Email Tim when new suggested tasks are ready for review.

## Known issues / follow-ups

- Dead JS function bodies (rOutreach*, rWebsiteAnalytics, rEmailActionRequired, rEcReview, etc.) still sit in `views.js`, `modals.js`, `core.js`. They aren't called but they bloat the bundle by ~12,000 lines. Safe to delete in a future pass once everything has been used and verified.
- The legacy rFinancePayments/rFinanceUpcoming/rFinanceTeam functions still exist but are no longer dispatched.
- The `team_members` table will be dropped by the migration, but `loadTeamMembers` was already removed from `loadData()`, so it's not referenced at load.
- The campaigns section still has its old Pipeline/List/Performance sub-view code, but with subs removed from SECTIONS the default `rCampaigns` body renders.
