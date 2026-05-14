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

### Sales (simplified)
- `rOpportunities()` shows: KPIs → "Needs your attention" surface → per-type pipeline columns
- "Needs attention" criteria: no update in 14+ days, missing expected close, or past expected close while open
- One screen per type (Retain Live, F&C Partnerships, F&C Direct) — no separate sub-nav

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

## Known issues / follow-ups

- Dead JS function bodies (rOutreach*, rWebsiteAnalytics, rEmailActionRequired, rEcReview, etc.) still sit in `views.js`, `modals.js`, `core.js`. They aren't called but they bloat the bundle by ~12,000 lines. Safe to delete in a future pass once everything has been used and verified.
- The legacy rFinancePayments/rFinanceUpcoming/rFinanceTeam functions still exist but are no longer dispatched.
- The `team_members` table will be dropped by the migration, but `loadTeamMembers` was already removed from `loadData()`, so it's not referenced at load.
- The campaigns section still has its old Pipeline/List/Performance sub-view code, but with subs removed from SECTIONS the default `rCampaigns` body renders.
