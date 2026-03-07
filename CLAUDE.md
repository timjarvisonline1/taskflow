# TaskFlow — Project Guide for Claude Code

## What is TaskFlow?

TaskFlow is a comprehensive task management and business operations platform built for Tim Jarvis, who runs two LLCs:
- **Tim Jarvis Online LLC** — banking via Brex
- **Film&Content LLC** — banking via Mercury, accounting via Zoho Books, payment processing via Zoho Payments

It manages tasks, projects, campaigns, sales (opportunities), clients, finance (payments, invoices, recurring expenses, forecasting, team payroll), email (Gmail integration with CRM features), and daily scheduling in a single-page app.

## Architecture

**100% client-side SPA** — no build step, no framework, no bundler. Vanilla JavaScript with a global state object `S` and string-based DOM rendering.

```
Browser (client JS)                   Vercel Serverless Functions
┌─────────────────────┐              ┌──────────────────────────────┐
│ index.html          │              │ api/_lib/        (shared)    │
│ js/config.js        │──settings──▶ │ api/settings/    (credentials)│
│ js/core.js          │──sync─────▶  │ api/sync/        (per-platform)│
│ js/views.js         │──gmail────▶  │ api/gmail/       (email ops)  │
│ js/modals.js        │──auth─────▶  │ api/auth/        (OAuth flows)│
│ js/features.js      │              │ api/knowledge/   (KB/RAG)     │
│ js/app.js           │              │ api/cron/        (periodic)   │
│ css/core.css        │              └──────────┬───────────────────┘
│ css/components.css  │                         │ service role key
│ css/features.css    │                         ▼
└─────────────────────┘              Supabase (PostgreSQL + Auth + pgvector)
                                     ◀──anon key + RLS──▶
```

**Key stack:**
- **Frontend**: Vanilla JS SPA, Chart.js for analytics, Inter font
- **Backend**: Supabase (PostgreSQL with RLS, Auth, REST API via PostgREST, pgvector for KB embeddings)
- **Hosting**: Vercel (Pro plan — 300s max function timeout, no cron support)
- **CDN libs**: Supabase JS v2 (UMD), Chart.js 4.4
- **Email**: Gmail API (OAuth 2.0) — scopes: `gmail.readonly`, `gmail.send`, `gmail.modify`
- **AI/Embeddings**: Anthropic Claude (email analysis, EC Review, KB RAG), OpenAI text-embedding-3-small (KB vectors)

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
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Gmail OAuth
- `OPENAI_API_KEY` — stored in `integration_credentials` table (per-user), used by KB embedding scripts via `getOpenAIKey(userId)`

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
│   ├── core.js             # State (S), data loading, CRUD helpers, timers, filters, reconciliation,
│   │                       #   email (polling, compose, drafts, schedule, rules), contact autocomplete
│   ├── views.js            # All view rendering (rDashboard, rToday, rTasks, rFinance, rEmail, entity dashboards, etc.)
│   ├── modals.js           # All modal UIs (detail, add, compose email, rule builder, entity detail openers, etc.)
│   ├── features.js         # Focus mode, command palette, drag & drop, scheduling, meeting tracking, calendar sync
│   └── app.js              # TF function registry (window.TF = {...})
│
├── css/
│   ├── core.css            # CSS variables, layout, sidebar, typography, sub-nav badges
│   ├── components.css      # Cards, badges, buttons, forms, tables (compact task rows)
│   └── features.css        # Finance, campaigns, projects, opportunities, email, compose toolbar, modals, entity tabs
│
├── api/
│   ├── _lib/
│   │   ├── supabase.js     # Service client, auth verification, upsertPayment, applyPayerMap
│   │   ├── gmail-auth.js   # Gmail OAuth token refresh
│   │   ├── sync-gmail.js   # Gmail thread metadata sync (with email rules engine)
│   │   ├── zoho-auth.js    # OAuth token refresh + code exchange for Zoho
│   │   ├── sync-brex.js    # Brex transaction sync
│   │   ├── sync-mercury.js # Mercury transaction sync
│   │   ├── sync-zoho-books.js    # Zoho Books sync
│   │   ├── sync-zoho-payments.js # Zoho Payments sync
│   │   ├── embeddings.js         # KB: core embedding library (chunk, embed, store, search, dedup)
│   │   └── entity-chunkers.js    # KB: 11 entity type chunkers (task, client, campaign, contact, etc.)
│   ├── gmail/
│   │   ├── threads.js      # GET — fetch thread list from Gmail API
│   │   ├── thread.js       # GET — fetch single thread with messages
│   │   ├── send.js         # POST — send email via Gmail API
│   │   ├── archive.js      # POST — archive thread (remove INBOX label)
│   │   ├── trash.js        # POST — trash thread
│   │   ├── mark-read.js    # POST — mark thread as read
│   │   ├── attachment.js   # GET — download attachment
│   │   ├── analyze.js     # POST — batch AI email analysis (Claude Sonnet)
│   │   ├── summarize.js   # POST — on-demand thread summarization
│   │   └── ec-suggest.js  # POST — AI end-client suggestions for EC Review
│   ├── knowledge/
│   │   ├── search.js          # POST — vector similarity search
│   │   ├── ai-ask.js          # POST — RAG-powered AI Q&A (keyword + vector → Claude)
│   │   ├── ai-draft.js        # POST — AI email/document drafting with KB context
│   │   ├── stats.js           # GET — KB statistics (chunk counts, source counts)
│   │   ├── ingest-emails.js   # POST — email thread embedding
│   │   ├── ingest-meetings.js # POST — meeting embedding
│   │   ├── ingest-document.js # POST — document text embedding
│   │   ├── ingest-url.js      # POST — web page embedding
│   │   ├── ingest-youtube.js  # POST — YouTube transcript embedding
│   │   └── sync-entities.js   # POST — batch entity sync (11 types → KB)
│   ├── auth/
│   │   └── gmail-connect.js # GET — initiate Gmail OAuth flow
│   ├── sync/
│   │   ├── brex.js         # POST — triggers Brex sync
│   │   ├── mercury.js      # POST — triggers Mercury sync
│   │   ├── zoho-books.js   # POST — triggers Zoho Books sync
│   │   ├── zoho-payments.js # POST — triggers Zoho Payments sync
│   │   └── cleanup-duplicates.js # POST — one-time duplicate cleanup
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
│   ├── schema.sql                  # Core schema (tasks, done, review, clients, campaigns, etc.)
│   ├── add-finance.sql             # finance_payments, payer_client_map tables
│   ├── add-finance-splits.sql      # finance_payment_splits table
│   ├── add-finance-integrations.sql # integration_credentials, sync_log tables
│   ├── add-finance-forecast.sql    # account_balances, scheduled_items, team_members tables
│   ├── add-scheduled-item-link.sql # scheduled_item_id FK on finance_payments
│   ├── add-campaign-billing.sql    # Campaign billing metadata columns
│   ├── add-finance-overhaul.sql    # Enhanced team_members, scheduled_items, opportunities
│   ├── add-activity-logs.sql       # activity_logs table
│   ├── add-meeting-key.sql         # meeting_key column on tasks
│   ├── add-inbox.sql               # is_inbox boolean column on tasks
│   ├── add-gmail-tables.sql        # gmail_threads table
│   ├── add-gmail-last-message-from.sql # last_message_from column
│   ├── add-client-contacts.sql     # Legacy client_contacts table
│   ├── migrate-to-contacts.sql     # contacts table (CRM foundation)
│   ├── add-notes-tables.sql        # campaign_notes, client_notes tables
│   ├── add-email-to-tasks.sql      # email_thread_id on tasks
│   ├── email-crm-integration.sql   # CRM columns on gmail_threads
│   ├── add-opportunity-types.sql   # opp_type on opportunities
│   ├── add-scheduled-emails.sql    # scheduled_emails table (schedule send)
│   ├── add-email-rules.sql         # email_rules table (rule engine)
│   ├── add-email-ai-analysis.sql   # AI analysis columns on gmail_threads
│   ├── add-end-clients.sql         # end_clients table (managed end-client entities)
│   └── add-knowledge-base.sql     # knowledge_chunks + knowledge_sources tables, pgvector, match_knowledge() fn
│
└── scripts/
    ├── run-migration.py        # Helper to run SQL migrations
    ├── fix-null-dates.py       # Utility for fixing null date issues
    ├── import-finance.js       # Finance data import (JS)
    ├── import-finance.py       # Finance data import (Python)
    ├── embed-emails.py         # KB: bulk email embedding from Gmail API (53K+ emails)
    ├── embed-meetings.py       # KB: meeting embedding from Read.ai data
    ├── embed-meetings-lite.py  # KB: lightweight meeting embedding
    ├── embed-batch.py          # KB: batch entity embedding
    ├── create-vector-index.py  # KB: create HNSW vector index
    └── run-embed.sh            # KB: shell wrapper for embedding scripts
```

## Client-Side Architecture

### Navigation Structure

The main navigation is defined by `SECTIONS` in `core.js`. Sections are ordered as follows:

| # | ID | Label | Kbd | Sub-views |
|---|-----|-------|-----|-----------|
| 1 | `dashboard` | Dashboard | 1 | — |
| 2 | `today` | Schedule | 2 | Suggested Schedule (default), Today's Schedule, Meeting Prep, Analytics, Daily Summary, Weekly Summary, Weekly Capacity |
| 3 | `tasks` | Tasks | 3 | Open Tasks, Completed, Review Queue (with badge), Quick Add Queue (with badge) |
| 4 | `opportunities` | Sales | 4 | Analytics, Retain Live, F&C Partnerships, F&C Direct, Profitability |
| 5 | `campaigns` | Campaigns | 5 | Pipeline, List, Performance |
| 6 | `projects` | Projects | 6 | Board, List, Timeline |
| 7 | `clients` | Clients | 7 | Active, Lapsed, End Clients, EC Review |
| 8 | `finance` | Finance | 8 | Overview, Transactions, Invoices, Upcoming, Recurring, Forecast, Team |
| 9 | `email` | Email | 9 | Action Required (with badge), Inbox, Sent, All Mail, Drafts (with badge), Scheduled (with badge), then Smart Inboxes: Clients (Active), Clients (Lapsed), Prospects, By Campaign, By Opportunity, Other |

**Mobile bottom tabs** (`MOB_VIEWS`): Add, Tasks, Review, Opps

### ICONS Map

The `ICONS` object in `core.js` maps icon names to Lucide SVG paths. Commonly used icons include:
- Navigation: `dashboard`, `calendar`, `tasks`, `gem`, `megaphone`, `folder`, `clients`, `dollar`, `mail`
- Sub-nav: `users`, `briefcase`, `bar_chart`, `sun`, `layers`, `activity`, `today`, `check`, `inbox`, `zap`, `clock`, `edit`, `filter`
- UI: `plus`, `edit`, `trash`, `clock`, `arrow_left`, `search`, `star`, `x`, `settings`
- Compose toolbar: `bold`, `italic`, `underline`, `strikethrough`, `list_ul`, `list_ol`, `quote`, `link`, `align_left`, `align_center`, `align_right`, `indent`, `outdent`, `eraser`, `undo`, `redo`, `smile`, `image`, `type`, `highlighter`, `paperclip`
- Email: `send`, `reply`, `reply_all`, `forward`, `archive`, `download`, `contact`

### Global State Object `S`

All app state lives in `window.S`, populated by `loadData()`:

```javascript
S = {
  // Data arrays (from Supabase)
  tasks: [],              // Active tasks (includes inbox items where isInbox=true)
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
  accountBalances: [],    // Live bank account balance snapshots
  scheduledItems: [],     // Recurring expenses, subscriptions, vendor payments
  teamMembers: [],        // Team payroll/commission data
  contacts: [],           // CRM contacts (name, email, clientId, endClient)
  endClients: [],         // Managed end-client entities (from Supabase end_clients table)
  meetings: [],           // Read.ai meeting records

  // Entity dashboard tab state
  clientTab: 'overview',       // Active tab in client detail modal
  endClientTab: 'overview',    // Active tab in end-client detail modal
  opportunityTab: 'overview',  // Active tab in opportunity detail modal
  // (campaignTab already existed — 'overview' default)

  // EC Review state
  ecSort: 'name',              // End-client list sort field
  _ecCandidates: [],           // AI-discovered EC candidates
  _ecAnalyzing: false,         // EC Review analysis in progress

  // Entity tracking (for tab re-renders)
  _lastEndClientDash: '',      // Currently open end-client name
  _lastCampaignId: '',         // Currently open campaign ID
  _lastOpportunityId: '',      // Currently open opportunity ID

  // Email state
  gmailThreads: [],       // Cached gmail thread metadata (from Supabase, limit 500)
  gmailSearch: '',        // Current search query
  gmailFilter: 'inbox',  // 'inbox' | 'sent' | 'all' | 'e-active' | 'e-lapsed' etc.
  gmailThread: null,      // Currently open thread with full messages
  gmailThreadId: '',      // Thread ID being viewed
  gmailUnread: 0,         // Unread count
  _gmailFetching: false,  // Loading state
  _gmailLiveThreads: null,// Live thread results (vs cached)
  _gmailNextPage: null,   // Pagination token
  _gmailCache: {},        // Per-filter cache {filter: {threads, nextPage}} — preserves data across view switches
  _filteredEmailResults: null, // Server-side filtered results (when email filters active)
  scheduledEmails: [],    // Scheduled emails (from Supabase)
  emailRules: [],         // Email rules (from Supabase)
  _domainMap: {},         // email domain → CRM context (built by _buildDomainMap)
  _threadCrmCache: {},    // thread_id → CRM context cache (invalidated on contact/domain changes)
  _emailTimer: null,      // Silent timer tracking email reading time

  // Email filters & bulk
  emailFilters: {},       // {client, endClient, opportunity, campaign} — filter values
  emailFilterExclude: {}, // {client, endClient, opportunity, campaign} — include/exclude toggle per filter
  emailBulkMode: false,   // Bulk selection mode active
  emailBulkSelected: {},  // Selected thread IDs for bulk actions

  // UI state
  view: 'dashboard',      // Current view — default is dashboard
  subView: '',            // Sub-view within a section
  filters: {},            // Task filters (client, endClient, campaign, project, opportunity, cat, imp, type, search, dateFrom, dateTo)
  collapsed: {},          // Collapsed sections
  layout: 'board',        // Task layout (board, list)
  groupBy: 'importance',  // Task grouping
  customOrder: {},        // Custom task ordering
  timers: {},             // Active timers by task ID {started, elapsed}
  pins: {},               // Pinned tasks
  schedOrder: {},         // Schedule ordering
  projTaskOrder: {},      // Project task ordering

  // Client detail view
  clientDetailName: '',   // Currently open client name (used by client detail modal)

  // Bulk operations
  bulkMode: false,        // Bulk selection active
  bulkSelected: {},       // Selected task IDs

  // Focus mode
  focusTask: null,        // Currently focused task ID
  focusDuration: 25,      // Focus session duration (minutes)

  // Finance UI state
  finFilter: '',          // '' | 'unmatched' | 'matched' | 'expenses'
  finDirection: '',       // '' | 'inflow' | 'outflow'
  finSearch: '',          // Search text
  finRange: '12m',        // Analytics range
  finShowAnalytics: true, // Show/hide analytics
  finCatFilter: '',       // Category filter
  finClientFilter: '',    // Client filter
  finCustomStart: '',     // Custom date range start
  finCustomEnd: '',       // Custom date range end
  finBulkMode: false,     // Finance bulk mode

  // Campaign/Opportunity UI state
  cpShowPaused: false,    // Show paused campaigns
  cpShowCompleted: false, // Show completed campaigns
  opShowClosed: false,    // Show closed opportunities

  // Forecast
  forecastHorizon: 90,    // Forecast lookout period (days)
  forecastScenario: 'expected', // 'expected' | 'conservative'
}
```

### Rendering Pattern

All views are rendered by calling `render()`, which calls the appropriate `rXxx()` function based on `S.view`. Views build HTML strings and inject via `innerHTML`. No virtual DOM.

```
render() → rDashboard() | rToday() | rTasks() | rFinance() | rCampaigns() | rProjects() | rOpportunities() | rClients() | rEmail()

Dashboard:
  rDashboard()             — Comprehensive overview: today's focus, productivity, sales pipeline,
                             finance snapshot, clients summary, activity heatmap, 4 charts
  initDashboardCharts()    — Importance donut, client time bar, pipeline donut, daily completions line

Schedule sub-views (via rToday() dispatcher):
  rSchedulePlanner()       — Suggested Schedule (default) — AI-prioritized task list with time slots
  rScheduleDay()           — Today's Schedule — Google Calendar-style hour-block timeline
  rSchedulePrep()          — Meeting Prep — all meetings with prep tasks + upcoming meetings without prep
  rScheduleAnalytics()     — Analytics — heatmap, time-of-day, daily completions, category/client charts
  rScheduleDaily()         — Daily Summary — inline KPIs, done/in-progress/carry-over/chasing sections
  rScheduleWeekly()        — Weekly Summary — this week vs last week comparison, streak, charts
  rScheduleCapacity()      — Weekly Capacity view

Tasks sub-views (via rTasks() dispatcher):
  (open)                   — Open tasks (compact rows with filter bar, excludes quick-add items)
  (inbox)                  — Quick Add Queue: quick-added tasks awaiting detail review (badge count in sub-nav)
  (completed)              — Completed tasks list
  (review)                 — Review queue with badge count in sub-nav

Sales (Opportunities) sub-views (via rOpportunities() dispatcher):
  rOpportunitiesBody()     — Analytics dashboard (default)
  rOppTypeSection()        — Per-type pipeline views (Retain Live, F&C Partnerships, F&C Direct)
  rOppProfitabilityDashboard() — Combined profitability dashboard across all types

Finance sub-views (via rFinance() dispatcher):
  rFinanceOverview()       — High-level overview with expandable bank account cards
  rFinancePayments()       — Transaction list (Unmatched/Matched/Expenses tabs)
  rFinanceInvoices()       — Invoice records from Zoho Books
  rFinanceUpcoming()       — Projected upcoming payments, expense reconciliation
  rFinanceRecurring()      — Recurring expenses, subscriptions
  rFinanceForecast()       — Cash flow forecast with compact toolbar
  rFinanceTeam()           — Payroll, commissions, team member costs

Campaigns sub-views:
  rCampaignPipeline()      — Kanban-style pipeline
  rCampaignList()          — Table view
  rCampaignPerformance()   — Performance charts/metrics

Projects sub-views:
  rProjectBoard()          — Kanban board by phase
  rProjectList()           — Table view
  rProjectTimeline()       — Gantt timeline

Clients sub-views:
  rClientsBody()           — Active/Lapsed directory with 6 columns
  rEndClientsBody()        — End-Clients directory with CRUD
  rEcReviewBody()          — EC Review: AI-powered end-client candidate discovery

Entity Detail Modals (full-screen tabbed dashboards, opened via detail-modal):
  rClientDashboard(c)      — Client: Overview | Tasks | Emails | Contacts | Meetings | Details
    rClTabOverview(c)      — KPIs, 4 charts, AI box, campaign/opportunity cards
    rClTabTasks(c)         — Open tasks (with scoring), completed, add task
    rClTabEmails(c)        — Contact email selector + email threads
    rClTabContacts(c)      — Contact cards with batch email
    rClTabMeetings(c)      — Campaign, opportunity, and Read.ai meetings
    rClTabDetails(c)       — Notes timeline, payment history, summary stats

  rEndClientDashboard(ec)  — End-Client: Overview | Tasks | Emails | Contacts | Meetings | Details
    rEcTabOverview(ec)     — KPIs, 2 charts, AI box, campaign/opportunity cards
    rEcTabTasks(ec)        — Open/completed tasks for EC's campaigns
    rEcTabEmails(ec)       — Contact email selector + threads
    rEcTabContacts(ec)     — Contact cards for EC's contacts
    rEcTabMeetings(ec)     — Meetings from associated campaigns/opportunities
    rEcTabDetails(ec)      — Editable fields, campaigns list, opportunities list

  rCampaignDashboard(cp,st)— Campaign: Overview | Tasks | Billing | Emails | Contacts | Meetings | Details
    rCpTabOverview(cp,st)  — KPIs, 3 charts, AI box
    rCpTabTasks(cp,st)     — Task management (existing)
    rCpTabBilling(cp,st)   — Billing records (existing)
    rCpTabEmails(cp,st)    — Contact email selector + email threads
    rCpTabContacts(cp,st)  — Client + EC contacts with email selector
    rCpTabMeetings(cp,st)  — Campaign meetings with add/delete
    rCpTabDetails(cp,st)   — Campaign info fields, links, notes

  rOpportunityDashboard(op,st) — Opportunity: Overview | Tasks | Emails | Meetings | Details
    rOpTabOverview(op,st)  — KPIs, 2 charts, AI box, stage indicator
    rOpTabTasks(op,st)     — Open/completed tasks
    rOpTabEmails(op,st)    — Contact email selector + threads
    rOpTabMeetings(op,st)  — Opportunity meetings with add/delete
    rOpTabDetails(op,st)   — All editable fields, save/convert/delete buttons

Email sub-views (via rEmail() dispatcher):
  rEmailActionRequired()   — AI-powered triage: urgency-grouped cards with CRM context, dismiss, snooze
  rEmailDraftList()        — Saved drafts with open/delete (uses localStorage)
  rEmailScheduledList()    — Scheduled emails: pending (with countdown), failed, sent history
  rEmailThread()           — Thread view: message list with expand/collapse, reply/forward/reply-all
  (inbox/sent/all)         — Thread list with filter toggle + search + CRM filter bar + bulk mode
  (smart inboxes)          — Filtered by CRM context: e-active, e-lapsed, e-prospects, e-campaigns, e-opportunities, e-other

Mobile views:
  rMobAdd()                — Quick add task
  rMobTasks()              — Task list
  rMobReview()             — Review queue with approve/review cards
  rMobOpportunities()      — Opportunities list
```

### Key View Functions

- **`buildClientMap()`** — Shared helper that aggregates client data (revenue, tasks, time, campaigns, opportunities, meetings, payments) while filtering out "Internal" and "N/A" entries. Used by both `rClients()` and `rDashboard()`.
- **`buildEndClientMap()`** — Aggregates end-client data across campaigns, opportunities, contacts, tasks. Returns a map of `{name → {campaigns, opportunities, contacts, openTasks, ...}}`.
- **`buildSubNav(subs)`** — Renders sub-navigation panel. Shows badge counts for review, inbox, drafts, scheduled emails, and smart inboxes.
- **`filterBar()`** — Renders compact filter controls (client, category, importance, type, search, date range). Uses 11px font, 6px border-radius pills.
- **`rEntityTabs(tabs, activeTab, setterFn)`** — Shared tab bar component for entity detail modals. Renders `.cp-tabs` with icons and optional badge counts.
- **`rContactEmailSelector(contacts, entityType, entityName)`** — Reusable checkbox-based contact email compose component. Shows contact list with checkboxes, "Select All" toggle, subject line input, and "Compose Email" button. Used in entity Emails and Contacts tabs.
- **`initEntityCharts(entityType)`** — Initializes Chart.js charts on entity Overview tabs. Checks for canvas elements by ID prefix, calls `killChart()` then appropriate `mk*` helpers with real data. Called via `setTimeout(fn, 50)` after tab render.

### Function Registry

All functions callable from HTML `onclick` handlers are registered on `window.TF`:

```javascript
window.TF = { nav, load, start, pause, openDetail, addTimeToTask, openClientDashboard, closeClientDashboard,
  setClientTab, setEndClientTab, setCampaignTab, setOpportunityTab,    // entity tab navigation
  cesToggleAll, cesCompose,                                             // contact email selector
  openClientDetailModal, openEndClientDetailModal, openCampaignDetail, openOpportunityDetail, ... }
```

HTML uses: `onclick="TF.openDetail('task-id')"`, `onchange="TF.filt('client', this.value)"`, etc.

### Key Helpers

- `gel(id)` — `document.getElementById(id)`
- `cel(tag, cls, html)` — create element
- `esc(str)` — HTML-escape
- `escAttr(str)` — attribute-safe escape
- `icon(name, size)` — Lucide SVG icon from ICONS map
- `today()` — today as YYYY-MM-DD
- `fmtT(seconds)` — format timer as H:MM:SS
- `fmtM(minutes)` — format minutes display
- `fmtUSD(amount)` — format as USD currency
- `fmtDShort(date)` — format date short
- `toast(msg, type)` — show notification ('ok', 'info', 'warn', 'err')
- `dashMet(label, value, color)` — metrics card widget
- `taskCard(task)` — reusable task card component
- `renderHeatmap(data, label)` — activity heatmap (used by dashboard + schedule analytics)
- `mkDonut(id, labels, data, colors)` — Chart.js donut chart helper
- `mkHBar(id, labels, data, color)` — Chart.js horizontal bar chart
- `mkHBarUSD(id, labels, data, color)` — Horizontal bar chart with USD formatting
- `mkLine(id, labels, data, color, label)` — Chart.js line chart
- `mkLineUSD(id, labels, data, color, label)` — Line chart with USD-formatted Y axis
- `mkDonutUSD(id, labels, data, colors)` — Donut chart with USD-formatted tooltip
- `killChart(id)` — Destroys existing chart instance to prevent canvas reuse errors
- `scheduleTasks()` — AI scheduling engine that slots tasks into free calendar gaps
- `taskScore(task)` — Priority scoring for task ordering
- `oppTypeMetrics(typeKey)` — Per-type opportunity statistics
- `buildUpcomingPayments(horizon)` — Builds projected inflows/outflows for forecast
- `aiBox(id, config)` — AI Assistant chat box component. Config: `{label, system, context, collapsed}`. Used on entity Overview tabs with entity-specific keywords and live data context.
- `emailAvatarColor(email)` — Consistent color from email string for avatar circles
- `getThreadCrmContext(thread)` — CRM context (client, campaigns, opportunities) for a thread. Works on both live threads (camelCase) and Supabase threads (snake_case)
- `resolveThreadCrmContext(from, to, cc)` — Full CRM resolution with contact cascade
- `applyEmailFilters(threads)` — Client-side CRM filter application via `getThreadCrmContext()`
- `loadFilteredEmailThreads()` — Server-side Supabase query with label + client_id conditions for filtered views

### Opportunity Types (OPP_TYPES)

Defined in `core.js`, each opportunity type has a key, label, color, and icon:
- `retain_live` — "Retain Live" (blue, users icon)
- `fc_partnership` — "F&C Partnerships" (purple, briefcase icon) — note: plural
- `fc_direct` — "F&C Direct" (amber, zap icon)

## Email System

### Gmail Integration

Gmail is connected via OAuth 2.0 with scopes `gmail.readonly`, `gmail.send`, `gmail.modify`. Thread metadata is synced to the `gmail_threads` Supabase table by `sync-gmail.js` (paginates up to 5 pages × 100 = 500 threads, stops when reaching already-known threads). Full message bodies are fetched on-demand via the `/api/gmail/thread` endpoint.

**API Endpoints:**
- `GET /api/gmail/threads` — list threads (label filter, search, pagination)
- `GET /api/gmail/thread?id=` — full thread with messages
- `POST /api/gmail/send` — send email (supports to/cc/bcc, threading, attachments)
- `POST /api/gmail/archive` — remove INBOX label (also updates Supabase labels)
- `POST /api/gmail/trash` — move to trash
- `POST /api/gmail/mark-read` — mark as read
- `GET /api/gmail/attachment` — download attachment
- `POST /api/gmail/analyze` — batch AI email analysis (Claude Sonnet, up to 30 threads per call, returns 12 fields: needs_reply, summary, urgency, category, sentiment, has_meeting, meeting_details, needs_followup, followup_details, suggested_client, suggested_task)
- `POST /api/gmail/summarize` — on-demand thread summarization (fetches full message bodies, caches result)
- `POST /api/gmail/ec-suggest` — AI-powered end-client suggestions. Accepts candidate contacts (email, name, clientName, emailCount, meetingCount), existing end-clients, and contacts. Returns end-client group suggestions with confidence scores, contact categorization, and reasoning. Used by EC Review feature.

### Compose Editor

The compose modal (`openComposeEmail()` in modals.js) features a two-row formatting toolbar:

```
Row 1: [Font ▾] [Size ▾] | B I U S | [TextColor ▾] [Highlight ▾] | [Clear]
Row 2: [Left] [Center] [Right] | [Bullet] [Num] [Indent+] [Indent-] [Quote] | [Link] [Emoji] [Image] | [Undo] [Redo]
```

**Key functions:**
- `execComposeCmd(cmd, val)` — wraps `document.execCommand()` with special handling for `createLink` (URL prompt) and `insertImage` (URL prompt)
- `updateComposeToolbar()` — syncs active states for toggle commands + font/size select values
- `toggleColorPicker(type)` — shows/hides text or background color picker (20 preset swatches in 5×4 grid)
- `toggleEmojiPicker()` — shows/hides emoji grid (~80 common emojis in 10×8 grid)
- `insertEmoji(emoji)` — inserts emoji via `insertText` command
- `selectColor(type, color)` — applies `foreColor` or `hiliteColor` and updates indicator

Pickers use glass-morphism panels positioned absolutely below toolbar buttons, closed on outside click.

### Contact Autocomplete

Recipients (To/Cc/Bcc) use autocomplete against `S.contacts`. Typing triggers `acRecipient(field)` which searches contacts by first name, last name, or email. Selected contacts become chips. The `window._composeRecipients` object tracks `{to:[], cc:[], bcc:[]}`.

### Categorization Bar

Every outgoing email requires categorization before sending. The compose modal includes a categorization bar with Client, End Client, Campaign, and Opportunity dropdowns (or "None / Internal" checkbox). CRM context is auto-detected from recipients via `_composeCatAutoDetect()` → `resolveThreadCrmContext()`.

### Draft Auto-Save

Drafts are stored in `localStorage` under key `tf_email_drafts`. Auto-save runs every 10 seconds while the compose modal is open (`window._composeDraftTimer`).

**Draft lifecycle:**
1. Compose opens → timer starts, `window._composeDraftId` tracks current draft
2. Every 10s → `_saveDraft()` captures full state (recipients, subject, body, attachments, categorization)
3. Close modal → prompt "Save as draft?" → Yes saves, No deletes auto-saved draft
4. Send email → timer cleared, draft deleted
5. Open draft → `openDraft(id)` → `openComposeEmail()` with full state restoration (recipients, categorization, body)

**Size mitigation:** If draft data exceeds 4MB, attachment binary data is stripped (filenames kept).

**Draft count badge** appears on the Drafts sub-nav item via `getDraftCount()`.

### Schedule Send

Scheduled emails are stored in the `scheduled_emails` Supabase table. The compose modal has a split send button: `[Send] [▾]` where the dropdown opens a schedule menu.

**Schedule presets:**
- In 1 hour
- Tomorrow morning (9:00 AM)
- Tomorrow afternoon (2:00 PM)
- Monday morning (9:00 AM)
- Custom date/time picker (`<input type="datetime-local">`)

**Sending mechanism:** The 60-second email polling cycle (`startEmailPolling`) calls `_checkScheduledEmails()` BEFORE the email view guard, so scheduled emails are checked regardless of current view. When `scheduled_at <= now()`, the email is sent via `/api/gmail/send` and status updated to `sent` or `failed`.

**Note:** Emails only send when the TaskFlow tab is open. The UI shows this disclaimer.

**Scheduled view** (`rEmailScheduledList`) shows pending (with countdown), failed (with error), and sent (history) sections.

### Email Rules Engine

Rules are stored in the `email_rules` Supabase table. Each rule has ordered conditions (AND logic) and actions. First matching rule wins (priority desc).

**Condition types:**
- `from_domain_equals` — sender domain exact match
- `from_email_contains` — sender email substring
- `subject_contains` — subject keyword
- `to_or_cc_contains` — To/CC substring
- `any_participant_domain` — any address has domain

**Action types:**
- `assign_client` — set client_id
- `assign_end_client` — set end_client
- `assign_campaign` — set campaign_id
- `assign_opportunity` — set opportunity_id
- `auto_archive` — archive matching threads

**Application points:**
1. **Client-side** — `openEmailThread()`: after thread loads, if no existing categorization, calls `applyEmailRules(thread)` → `_applyRuleActionsToThread(threadId, actions)` to update Supabase + local cache
2. **Server-side** — `sync-gmail.js`: loads active rules once per sync, applies matching rule actions to upsert row after contact-based matching fails

**Rule builder UI** — gear icon (⚙️) in email page header opens `openEmailRulesModal()`:
- List view: rule cards with name, condition/action summary, enable/disable toggle, edit/delete
- Editor: `_openRuleEditor()` → `_renderRuleEditor()` with add/remove condition/action rows, type selects, value inputs (text or dropdown depending on action type)

### Smart Inboxes (CRM Context)

Email threads are categorized into smart inboxes based on CRM data:
- **Clients (Active)** — thread has contact/domain matching an active client
- **Clients (Lapsed)** — matches a lapsed client
- **Prospects** — matches an opportunity contact
- **By Campaign** — matches a campaign-associated contact
- **By Opportunity** — matches an opportunity-associated contact
- **Other** — no CRM match

CRM resolution uses a multi-level cascade in `resolveThreadCrmContext()`:
1. Direct contact email match (`S.contacts`)
2. Domain-based matching via `S._domainMap` (built by `_buildDomainMap()` from contact domains → endClient)
3. Falls back to thread-level stored categorization (client_id, campaign_id, etc.)

**Cache invalidation:** `_buildDomainMap()` automatically clears `S._threadCrmCache = {}` so adding a new contact immediately updates smart inbox views.

Smart inboxes only show INBOX-labeled threads (excludes archived).

### Email Filters

Non-smart inbox views (Inbox, Sent, All Mail) have a CRM filter bar with 4 dropdowns:
- **Client** — active clients only (from `S.clientRecords` where status=active)
- **End-Client** — unique end-clients from contacts and campaigns
- **Opportunity** — open opportunities only
- **Campaign** — active/setup campaigns

Each filter has an include/exclude toggle (`=`/`≠`). Special `__none__` value matches threads with no CRM association (e.g., "No Client"). A "Clear" button resets all filters.

**Server-side dynamic loading:** When filters are active, `loadFilteredEmailThreads()` queries Supabase directly with server-side conditions (label + client_id) instead of filtering the pre-loaded 500 threads. This ensures filtered views return a full page of results. Client filter uses `client_id` column (reliable — set during sync via email matching). End-client, opportunity, and campaign filters are applied client-side via `getThreadCrmContext()` on the server-filtered results.

**Key functions:** `setEmailFilter(field, value)`, `toggleEmailFilterExclude(field)`, `clearEmailFilters()`, `emailHasActiveFilters()`, `applyEmailFilters(threads)`, `loadFilteredEmailThreads()`

### Email Bulk Archive

A "Bulk" button in the email header enables checkbox selection mode (follows the `finBulkMode` pattern from Finance). Features:
- Checkbox on each email row (replaces unread dot)
- Click row toggles selection (instead of opening thread)
- Action bar with Select All, Deselect, and "Archive N" buttons
- Sequential archive via `/api/gmail/archive` API
- After bulk archive, filtered results auto-reload to backfill the view
- Bulk mode auto-exits on: thread open, view switch, archive completion

**Key functions:** `emailToggleBulk()`, `emailToggleSel(threadId)`, `emailSelectAll()`, `emailDeselectAll()`, `emailBulkCount()`, `bulkArchiveEmails()`

### Email View Caching

`S._gmailCache` stores per-filter live thread results (`{filter: {threads, nextPage}}`). When switching between Inbox/Sent views, threads are saved to cache and restored from cache, preventing data loss and redundant fetches. Cache is cleared on refresh.

`subNav()` delegates to `setGmailFilter()` for email views to keep `S.subView` and `S.gmailFilter` in sync.

**Thread source logic in `rEmail()`:**
- Smart inboxes → filter `S.gmailThreads` (Supabase) by CRM context
- Filters active → use `S._filteredEmailResults` (server-side query)
- All Mail (no filters) → use `S.gmailThreads` (Supabase)
- Inbox/Sent (no filters) → use `S._gmailLiveThreads` (Gmail API)

### Email Time Tracking

Opening a thread starts a silent timer (`S._emailTimer`). When closing or switching threads, `_flushEmailTimer()` logs the time as a completed "Email: {subject}" task if >5 seconds elapsed. Categorization from the thread context is applied to the logged task.

### Email Polling

`startEmailPolling()` runs a 60-second interval that:
1. Checks and sends due scheduled emails (`_checkScheduledEmails()`) — runs regardless of view
2. If on email view and not in a thread → `pollGmailInbox()` for new emails

New emails trigger `applyNewEmails()` which updates the thread list and shows a toast notification.

**Refresh flow** (`refreshGmailInbox()`): Clears all view caches → syncs Gmail metadata to Supabase (`/api/sync/gmail`) → fetches live threads (50 max) → reloads Supabase threads (`loadGmailThreads()`, 500 max) → triggers AI analysis for new threads. A `_refreshing` flag prevents race with `ensureGmailThreads()`.

### Action Required (AI Email Triage)

Replaces the previous Zapier → ChatGPT → Review Queue flow. Uses Claude Sonnet to analyze emails directly within TaskFlow.

**Database columns** on `gmail_threads`:
- Core: `needs_reply` (boolean), `ai_summary`, `ai_urgency` (critical/high/normal/low), `ai_category`, `reply_status` (pending/dismissed/snoozed), `snoozed_until`, `ai_analyzed_at`
- Sentiment: `ai_sentiment` (positive/neutral/cautious/negative)
- Meeting: `has_meeting` (boolean), `meeting_details` (string)
- Follow-up: `needs_followup` (boolean), `followup_details` (string)
- Smart CRM: `ai_client_name` (AI-inferred client name)
- Summarization: `full_summary` (cached thread summary), `full_summary_at`
- Task: `ai_suggested_task` (JSON string of suggested task)

**Analysis flow:**
1. After Gmail sync/refresh/poll, `analyzeNewEmails()` identifies unanalyzed INBOX threads (including threads where user sent last message, for follow-up detection)
2. Sends batch of thread metadata (subject, snippet, from, to, labels, userSentLast) to `/api/gmail/analyze`
3. Endpoint calls Claude Sonnet API with expanded prompt returning 12 fields per thread
4. Results stored to `gmail_threads` table and merged into local state
5. Smart CRM: if Claude suggests a client matching one in the DB, auto-sets `client_id`
6. Task suggestions stored as JSON on thread; shown as "Create Task" button in UI
7. Action Required badge updates in sub-nav (includes follow-ups in count)

**Auto-reply detection** (in `sync-gmail.js`): If `last_message_from` changes to user's email on a thread that previously had `needs_reply: true`, automatically clears `needs_reply`. If an external sender replies to a thread that was `needs_reply: false`, resets to `null` for re-analysis.

**Triage actions:**
- **Open** → opens thread view (existing email time tracking starts)
- **Create Task** → parses `ai_suggested_task` JSON, calls `dbAddTask()` with pre-filled fields, clears suggestion
- **Dismiss** → sets `reply_status: 'dismissed'`, removes from Action Required
- **Snooze** → sets `reply_status: 'snoozed'` + `snoozed_until`, hides until time passes (checked at render time, no cron needed)
- **Done** (follow-ups) → clears `needs_followup`, removes from Follow-Up Required section

**Thread summarization:** `POST /api/gmail/summarize` — on-demand for threads with 10+ messages. Fetches full message bodies from Gmail API, sends to Claude for 3-5 bullet point summary, caches result.

**API endpoints:**
- `POST /api/gmail/analyze` — batch analyzes up to 30 threads per Claude API call
- `POST /api/gmail/summarize` — on-demand thread summarization with caching

**Key functions:** `analyzeNewEmails()`, `getActionRequiredCount()`, `getActionRequiredThreads()`, `dismissEmailAction()`, `snoozeEmailAction()`, `openSnoozeMenu()`, `dismissFollowup()`, `summarizeThread()`, `doSummarize()`, `resummarizeThread()`, `createTaskFromSuggestion()`, `rEmailActionRequired()`

## Finance System

### Payment Lifecycle

Payments flow through these states:
- **unmatched** — new payment, needs client association
- **matched** — associated with a client (and optionally campaign/end client). Also includes split payments.
- **split** — internally still a status in the database, but displayed under the Matched tab in the UI (Split tab was removed)
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

### Finance Overview Deduplication

`rFinanceOverview()` applies two levels of dedup to recent transactions:
1. Filters out `zoho_books` source records (accounting duplicates)
2. Deduplicates by `date + amount` (within 1 cent) to remove cross-source duplicates

### Expense Reconciliation

Outflow payments (expenses) can be reconciled against scheduled/recurring items:
- `openExpenseReconcileModal(paymentId)` — shows expense details, category selector, matching suggestions, and action buttons
- `linkExpenseToScheduled(paymentId, scheduledItemId)` — links an expense to an existing recurring item
- `saveExpenseAsOneOff(paymentId)` — creates a one-off scheduled item and auto-links
- `autoReconcile()` — bulk auto-matching of expenses to scheduled items

### Data Sources

| Source | Platform | Auth | Direction |
|--------|----------|------|-----------|
| `brex` | Brex API | Bearer token | Both |
| `mercury` | Mercury API | Bearer secret-token | Both |
| `zoho_books` | Zoho Books API | OAuth 2.0 | Both |
| `zoho_payments` | Zoho Payments API | OAuth 2.0 | Inflow |
| `stripe` | CSV import (legacy) | N/A | Inflow |
| `stripe2` | CSV import (legacy) | N/A | Inflow |
| `zoho` | CSV import (legacy) | N/A | Inflow |

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
- Organization ID: `899890816` (Film&Content LLC)

**Zoho Payments:**
- Base: `https://payments.zoho.com/api/v1`
- Auth: `Authorization: Zoho-oauthtoken {access_token}` + `?account_id={id}`
- Scope prefix: `ZohoPay` (not `ZohoPayments`)
- Amounts in **dollars** (not cents — do NOT divide by 100)
- Date fields may return Unix timestamps — use `parseDate()` helper

**Zoho OAuth (both):**
- Token endpoint: `https://accounts.zoho.com/oauth/v2/token`
- Self Client: ONE per Zoho account, shared between Books and Payments
- Code exchange gives refresh_token + access_token
- Refresh token is long-lived; access token expires in 1 hour

## Knowledge Base System (RAG)

TaskFlow includes a vector-based knowledge base powered by pgvector (Supabase) and OpenAI embeddings. Content from emails, meetings, documents, web pages, YouTube transcripts, and all CRM entities is chunked, embedded, and stored for semantic search and AI-powered Q&A.

### Architecture

```
Content Sources → Chunking → OpenAI Embedding → Supabase pgvector → Search/RAG
                                (text-embedding-3-small, 1536 dims)
```

**Core library:** `api/_lib/embeddings.js` — shared functions for chunking, embedding, storing, searching, and deduplication.

**Entity chunkers:** `api/_lib/entity-chunkers.js` — 11 entity-type chunkers that convert DB records into natural-language text for semantic search:
- `chunkTask(task)`, `chunkCompletedTask(task)` — active/completed tasks
- `chunkClient(client, notes)` — client with notes
- `chunkCampaign(campaign, notes)` — campaign with notes
- `chunkContact(contact)` — CRM contact
- `chunkProject(project, phases)` — project with phases
- `chunkOpportunity(opp)` — opportunity with fees/contact/stage
- `chunkActivityLogs(taskId, taskItem, logs)` — activity log entries
- `chunkFinancePayment(payment)` — finance payment/expense
- `chunkScheduledItem(item)` — recurring expense/income
- `chunkTeamMember(member)` — team member with salary/commission

### Chunking Strategy

- **Default chunk size:** 2,000 chars with 200 char overlap
- **Email chunks:** 15,000 chars max (~5,000 tokens) per message, header prepended
- **Meeting chunks:** Summary, chapter summaries, transcript windows, action items — each as separate chunks
- **Web pages:** 1,500 chars with 150 char overlap
- **Boundary-aware splitting:** breaks at paragraph → sentence → word boundaries (last 30% of chunk)
- **Deduplication:** SHA-256 content hash, upsert on (user_id, source_type, source_id, chunk_index)

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/knowledge/search` | POST | Vector similarity search with optional source_type and client_id filters |
| `/api/knowledge/ai-ask` | POST | RAG Q&A: keyword + vector search → ranked chunks → Claude answer |
| `/api/knowledge/ai-draft` | POST | AI drafting with KB context |
| `/api/knowledge/stats` | GET | KB statistics (chunk counts, source counts, tokens used) |
| `/api/knowledge/ingest-emails` | POST | Embed email threads |
| `/api/knowledge/ingest-meetings` | POST | Embed meeting records |
| `/api/knowledge/ingest-document` | POST | Embed document text |
| `/api/knowledge/ingest-url` | POST | Embed web page content |
| `/api/knowledge/ingest-youtube` | POST | Embed YouTube transcript |
| `/api/knowledge/sync-entities` | POST | Batch sync CRM entities (11 types) to KB |

### Bulk Embedding Scripts

Python CLI scripts for initial population of the knowledge base:

- **`scripts/embed-emails.py`** — Bulk email embedding from Gmail API. Processes 53,000+ emails. Flags: `--offset N`, `--limit N`, `--client-only`, `--from-gmail`. Auto-resumes via `knowledge_sources` table tracking. Auto-refreshes Gmail OAuth tokens.
- **`scripts/embed-meetings.py`** — Read.ai meeting embedding (summary + chapters + transcript + action items)
- **`scripts/embed-batch.py`** — Batch entity embedding (tasks, clients, campaigns, etc.)
- **`scripts/create-vector-index.py`** — Creates HNSW vector index on `knowledge_chunks.embedding`

### Search & RAG

**Vector search** (`searchKnowledge()`): Calls `match_knowledge()` SQL function with cosine distance, returns chunks above similarity threshold (default 0.3), ordered by relevance.

**AI Q&A** (`/api/knowledge/ai-ask`): Combines keyword search (SQL `ilike`) with vector similarity search, deduplicates results, sends top chunks as context to Claude for answer generation.

### Key Functions (embeddings.js)

- `embedTexts(apiKey, texts)` — Batch embed via OpenAI (auto-batches at 2048)
- `chunkText(text, maxChars, overlap)` — Boundary-aware text splitting
- `chunkMeeting(meeting)` — Meeting → summary/chapter/transcript/action chunks
- `chunkEmailThread(threadId, subject, messages, crmMetadata)` — Email → per-message chunks
- `chunkWebPage(text, title, url)` — Web page → overlapping chunks
- `storeChunks(client, userId, sourceType, sourceId, chunks)` — Upsert with dedup (returns {inserted, skipped, updated})
- `upsertSource(client, userId, sourceType, sourceId, ...)` — Update ingestion tracking
- `searchKnowledge(client, userId, queryEmbedding, opts)` — Vector similarity search
- `cleanOrphans(client, userId, sourceType, validSourceIds)` — Remove embeddings for deleted records

## Database Tables

### Core Tables
- `tasks` — active tasks with due dates, importance, client, campaign, project, opportunity associations, meeting_key, duration, is_inbox, email_thread_id
- `done` — completed tasks (moved from tasks on completion)
- `review` — items to review/approve before becoming tasks
- `clients` — client/partner records
- `campaigns` — marketing campaign records with fees, dates, links, billing frequency/terms
- `projects` — project records with phases
- `project_phases` — ordered phases within projects
- `opportunities` — sales pipeline items with opp_type, payment method, processing fees, receiving account
- `payments` — campaign-related payment records
- `campaign_meetings` — meeting records linked to campaigns
- `opportunity_meetings` — meeting records linked to opportunities
- `activity_logs` — per-task log entries
- `campaign_notes` — notes on campaigns
- `client_notes` — notes on clients

### End-Client Table
- `end_clients` — managed end-client entities (UUID PK, user_id, name, client_id FK → clients.id, notes, status: active/inactive, created_at, updated_at). RLS enabled.

### Finance Tables
- `finance_payments` — all financial transactions from all sources
- `finance_payment_splits` — split payment allocations
- `payer_client_map` — auto-matching rules (payer email/name → client)
- `integration_credentials` — API keys and OAuth tokens per platform
- `sync_log` — audit trail for all sync operations
- `account_balances` — live snapshots of bank account balances
- `scheduled_items` — recurring expenses/subscriptions
- `team_members` — payroll data

### Knowledge Base Tables
- `knowledge_chunks` — vector-embedded content chunks (pgvector 1536-dim). Fields: source_type (meeting/email/webpage/youtube/document/task/client/campaign/contact/project/opportunity/activity/payment/scheduled/team), source_id, chunk_index, title, content, client_id FK, end_client, campaign_id FK, date, people[], tags[], embedding vector(1536), embedding_model, token_count, content_hash. HNSW index for cosine distance. Unique constraint on (user_id, source_type, source_id, chunk_index).
- `knowledge_sources` — ingestion tracking per source. Fields: source_type, source_id, name, url, status (pending/processing/complete/error), chunks_count, tokens_used, error_message, last_ingested_at. Unique constraint on (user_id, source_type, source_id).
- `match_knowledge()` — SQL function for cosine similarity search with optional source_type and client_id filters, returns ranked chunks above threshold.

### Email Tables
- `gmail_threads` — thread metadata synced from Gmail (subject, from, to, cc, snippet, labels, is_unread, client_id, end_client, campaign_id, opportunity_id, last_message_from, last_message_at)
- `contacts` — CRM contacts (first_name, last_name, email, client_id, end_client, phone, notes)
- `scheduled_emails` — emails queued for future sending (to, cc, bcc, subject, body, attachments, scheduled_at, status: pending/sent/failed)
- `email_rules` — auto-categorization rules (name, conditions JSON, actions JSON, is_active, priority)

All tables have RLS policies: users can only read/write their own data.

## DB Helper Functions (core.js)

Each entity has standard CRUD helpers:

- **Tasks**: `dbAddTask()`, `dbEditTask()`, `dbDeleteTask()`, `dbCompleteTask()`, `dbUpdateTaskDuration()`, `dbUpdateMeetingKey()`, `dbDeleteReview()`, `dbAddLog()`
- **Campaigns**: `dbAddCampaign()`, `dbEditCampaign()`, `dbDeleteCampaign()`, `dbAddPayment()`, `dbAddCampaignMeeting()`
- **Projects**: `dbAddProject()`, `dbEditProject()`, `dbDeleteProject()`, `dbAddPhase()`, `dbEditPhase()`, `dbDeletePhase()`
- **Opportunities**: `dbAddOpportunity()`, `dbEditOpportunity()`, `dbDeleteOpportunity()`
- **Finance**: `dbAddFinancePayment()`, `dbEditFinancePayment()`, `dbDeleteFinancePayment()`, `dbAddFinancePaymentSplit()`, `dbEditFinancePaymentSplit()`, `dbDeleteFinancePaymentSplit()`
- **Scheduled Items**: `dbAddScheduledItem()`, `dbEditScheduledItem()`, `dbDeleteScheduledItem()`
- **Team Members**: `dbAddTeamMember()`, `dbEditTeamMember()`, `dbDeleteTeamMember()`
- **Clients**: `dbAddClient()`, `dbEditClient()`, `dbAssociatePayerToClient()`
- **Contacts**: `dbAddContact()`, `dbEditContact()`, `dbDeleteContact()`
- **End Clients**: `dbAddEndClient()`, `dbEditEndClient()`, `dbDeleteEndClient()`, `loadEndClients()`
- **Reconciliation**: `linkExpenseToScheduled()`, `unlinkExpenseFromScheduled()`, `saveExpenseAsOneOff()`
- **Email Drafts** (localStorage): `_loadDrafts()`, `_saveDraft(id)`, `_deleteDraft(id)`, `openDraft(id)`, `deleteDraft(id)`, `getDraftCount()`
- **Scheduled Emails**: `loadScheduledEmails()`, `scheduleEmail(scheduledAt)`, `cancelScheduledEmail(id)`, `_checkScheduledEmails()`
- **Email Rules**: `loadEmailRules()`, `applyEmailRules(thread)`, `_applyRuleActionsToThread(threadId, actions)`, `saveEmailRule(data)`, `deleteEmailRule(id)`, `toggleEmailRule(id, active)`

## Features (features.js)

- **Focus Mode** — full-screen single-task focus with Pomodoro-style timer (`openFocus`, `pauseFocus`, `resumeFocus`, `doneFocus`, `setFocusDur`)
- **Command Palette** — searchable action launcher (`openCmdPalette`, `cmdSearch`, `closeCmdPalette`)
- **Drag & Drop** — task reordering, schedule drag, project board drag
- **Meeting Auto-Tracking** — 30-second poll for ended unlogged meetings from Google Calendar (`startMeetingCheck`, `completeMeetingEnd`, `dismissMeetingEnd`)
- **Scheduling Engine** — smart task-into-gap scheduling (`calcFreeSlots`, `scheduleTaskIntoSlot`)
- **Daily Summary** — `openDailySummary()` modal + inline `rScheduleDaily()` view
- **Client Reports** — `openClientReport()`, `genClientReport()` for client-specific reporting
- **Bulk Operations** — multi-select tasks for batch completion
- **Pinning** — star/pin important tasks
- **Activity Logging** — per-task activity trail (`addLog`)
- **Recurring Task Processing** — `processRecurring()` auto-creates tasks from templates
- **Add Time to Tasks** — `addTimeToTask(id, mins)` for manually adding worked time when timer wasn't started

## Deployment

- **Automatic**: Push to `main` branch → Vercel builds and deploys
- **Manual sync functions**: Triggered via UI "Sync Now" buttons
- **Cron**: All platform syncs are manual only via "Sync Now" buttons.

## Coding Conventions

1. **No frameworks** — vanilla JS only, no React/Vue/etc.
2. **No build step** — files served as-is
3. **Global state** — everything on `S` object
4. **String HTML** — views build HTML strings, not DOM nodes
5. **Semicolons optional** — code uses semicolons inconsistently (ok either way)
6. **Function names** — camelCase, registered on `window.TF` for HTML access
7. **CSS variables** — defined in `css/core.css` (--t1, --t2, --t3, --t4, --bg, --bg1, --green, --red, --blue, --purple50, --pink, --gborder, --r, --glass, --accent, etc.)
8. **No TypeScript** — all vanilla JS
9. **API endpoints** — CommonJS modules, `module.exports = async function handler(req, res)`
10. **Supabase client-side** — uses `_sb` global from config.js (anon key + RLS)
11. **Supabase server-side** — uses `getServiceClient()` from `api/_lib/supabase.js` (service key, bypasses RLS)
12. **Modal pattern** — build HTML string → `gel('m-body').innerHTML = h` → `gel('modal').classList.add('on')`
13. **Toggle pattern** — modal sections use `modalToggle(id)` with `dt-*` checkbox IDs to show/hide field groups
14. **Glass morphism** — UI uses `var(--glass)` background with `backdrop-filter:blur()` for panels and dropdowns
15. **Entity tabs** — `.cp-tabs` / `.cp-tab` / `.cp-tab.on` for tab bars; `.entity-tab-content` for tab body; `.cp-tab-badge` for badge counts
16. **Contact email selector** — `.ces-wrap` for container, `.ces-cb` for checkboxes
17. **Full-screen modals** — `detail-modal` container + `.full-detail` class (components.css:66-82)

## Common Tasks

### Adding a new view
1. Add render function `rNewView()` in `views.js`
2. Add navigation case in `render()` function in `core.js`
3. Add nav item in `buildNav()` in `views.js`

### Adding a new sub-view
1. Add sub entry to the parent section in `SECTIONS` array (`core.js`)
2. Add the icon to `ICONS` map if not already present
3. Add render function in `views.js`
4. Add case in the parent's dispatcher (e.g., `rToday()`, `rFinance()`, `rEmail()`)
5. If it needs chart initialization, add to the `setTimeout` block in `render()` that calls chart init functions

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

### Adding a new entity (e.g., like scheduled items)
1. Add DB helper functions in `core.js` (`dbAdd/dbEdit/dbDelete`)
2. Add load function and call from `loadData()`
3. Add modal functions in `modals.js` (open, save, delete)
4. Add render in `views.js`
5. Register all functions in `window.TF` in `app.js`
6. Create SQL migration in `supabase/`

## Known Quirks

- Brex `posted_at_start` parameter causes 400 errors — removed entirely
- Zoho Books `/expenses` doesn't support `sort_column=last_modified_time` — use `date` instead
- Zoho Payments date fields return Unix timestamps (epoch seconds) — `parseDate()` helper handles conversion
- Zoho's Self Client generates a ONE-TIME auth code — must be exchanged within 10 minutes
- Test Connection endpoint merges stored credentials with form fields — no need to re-enter everything
- Toast messages last 8s for errors, 3.2s for success
- `vercel.json` maxDuration applies to `api/sync/*.js` (300s on Pro plan)
- CSV-imported records use source names `stripe`, `stripe2`, `zoho`, `brex` while live sync uses `zoho_books`, `zoho_payments`, `mercury`, `brex`
- Client select dropdowns include a blank "Select..." first option to prevent defaulting to first client
- `saveDetail()` and `markAlreadyCompleted()` check the client toggle checkbox before reading client value — if unchecked, client is cleared
- `dbCompleteTask()` calls `taskData.due.toISOString()` — due must be a Date object or null, never a string
- Critical tasks in the calendar timeline use RED (`rgba(239,68,68,0.28)`) — distinct from meeting pink
- `buildClientMap()` filters out "Internal" and "N/A" client names from all client views and dashboards
- The Finance Transactions view has no separate Split tab — split records are included in the Matched tab
- Quick Add sets `is_inbox=true`. Desktop Add Modal does not. Saving from detail modal always clears `isInbox`
- Open Tasks view excludes inbox items (`!t.isInbox`)
- `_buildDomainMap()` must clear `S._threadCrmCache` to ensure smart inbox views update after contact changes
- `closeModal()` checks for active compose and prompts "Save as draft?" — bypasses draft prompt when called after `sendEmail()` which handles cleanup directly
- Scheduled emails only send when the TaskFlow tab is open (client-side polling, no server-side cron)
- Email rules use AND logic for conditions, first matching rule wins based on priority
- `setGmailFilter()` must be used for email view switches (not `subNav()` directly) to keep `S.subView` and `S.gmailFilter` in sync
- Archiving from Inbox removes from live list; archiving from other views invalidates inbox cache only (All Mail keeps everything)
- All Mail view uses `S.gmailThreads` (Supabase data), not live Gmail API fetch
- `gmail_threads.client_id` is set during sync via email matching — reliable for server-side filtering. `end_client`/`campaign_id`/`opportunity_id` are only set by email rules — less reliable for server-side queries
- `loadFilteredEmailThreads()` applies client_id filter server-side but end-client/opportunity/campaign filters client-side via CRM context
- Gmail sync (`sync-gmail.js`) paginates up to 5 pages × 100 threads, stopping when all threads on a page are already in Supabase
- KB embedding scripts require `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, and OpenAI API key (from `integration_credentials` table) — keys are in Vercel dashboard only, not local
- `embed-emails.py` auto-resumes via `knowledge_sources` table — tracks last processed source_id, skips already-complete entries
- `storeChunks()` does clean re-ingest: deletes extra chunks if source now has fewer chunks than before
- Entity tab setters must re-render `detail-body` innerHTML directly — calling `render()` would close the modal
- `initEntityCharts()` requires `setTimeout(fn, 50)` after rendering to ensure canvas elements exist in DOM
- Campaign `openCampaignDetail()` always uses modal (desktop in-page branch removed) — old function renamed `_openCampaignDetail_LEGACY`
- Opportunity Details tab preserves same DOM element IDs (`op-name`, `op-stage`, `op-client`, etc.) for `saveOpportunity()` compatibility
- `closeCampaignDashboard()` now calls `closeModal()` since campaign always renders in modal
- `rCampaigns()` no longer checks `S.campaignDetailId` for in-page rendering

## Current Status (as of 2026-03-07)

### Integrations
- **Brex**: Connected, syncing ~308 transactions
- **Mercury**: Connected, syncing
- **Zoho Books**: Connected, syncing (orgId 899890816 — Film&Content LLC)
- **Zoho Payments**: Connected, syncing ~69 records
- **Gmail**: Connected via OAuth (readonly + send + modify scopes)
- **Anthropic (Claude AI)**: API key stored in integration_credentials, powers email analysis + EC Review + KB RAG
- **OpenAI**: API key stored in integration_credentials, powers KB embeddings (text-embedding-3-small)
- **Knowledge Base**: pgvector in Supabase — 53,000+ emails embedded, meetings embedded, entities synced

### What's Working
- All four finance platforms sync via "Sync Now" buttons
- Cross-source duplicate prevention on insert
- Finance section fully operational: overview, transactions, invoices, upcoming, recurring, forecast, team
- Projects with phases, board/list/timeline views
- Sales pipeline with Profitability as own sub-section
- Expense reconciliation with auto-match, manual link, and one-off save
- Focus mode, command palette, drag & drop scheduling
- Meeting auto-tracking from Google Calendar
- Dashboard with comprehensive overview
- Schedule section with 7 sub-views
- Clients section with Active, Lapsed, End Clients, and EC Review sub-views
- **Full-screen tabbed entity dashboards** for all 4 entities (Client, End-Client, Campaign, Opportunity)
- **Contact email selector** — checkbox-based batch email compose from any entity
- **Entity-specific charts** — Chart.js analytics on every entity Overview tab
- **End-Client management** — CRUD for end-client entities with Supabase table
- **EC Review** — AI-powered end-client candidate discovery from email/meeting data
- **Knowledge Base (RAG)** — pgvector-backed semantic search across emails, meetings, and CRM entities
- **KB API endpoints** — search, AI Q&A, ingestion for emails/meetings/documents/URLs/YouTube
- **Bulk email embedding** — 53,000+ emails embedded via `scripts/embed-emails.py`
- Quick Add Queue with badge counts
- Mobile bottom tabs: Add, Tasks, Review, Opps

### Email Features (Complete)
- Gmail integration with full read/send/archive/trash/mark-read
- Rich text compose with two-row formatting toolbar (font family, font size, bold/italic/underline/strikethrough, text color, highlight color, alignment, lists, indent/outdent, blockquote, link, emoji picker, inline image, clear formatting, undo/redo)
- Contact autocomplete with avatar chips
- Required categorization before sending (client, end client, campaign, opportunity)
- Forward, Reply, Reply All with quote threading
- File attachments (encode as base64)
- Email signature editor (localStorage)
- Draft auto-save (10-second timer, localStorage, close-modal prompt, full state restoration)
- Schedule send (Supabase-backed, split send button with presets + custom datetime, client-side polling)
- Email rules engine (condition/action based, visual rule builder, server-side + client-side application)
- Smart inboxes (Active Clients, Lapsed Clients, Prospects, By Campaign, By Opportunity, Other)
- CRM context resolution (contact cascade → domain matching → stored categorization)
- Silent email time tracking (auto-logs reading time as completed tasks)
- Real-time polling (60-second interval for new emails + scheduled email dispatch)
- Keyboard shortcuts (email-specific shortcuts disabled during compose)
- Thread view with message expand/collapse, action buttons, contact pills
- **Action Required** — AI-powered email triage (Claude Sonnet analyzes emails for needs_reply, urgency, summary, category)
- Action Required sub-view with urgency grouping, CRM context pills, dismiss, snooze
- Auto-reply detection (sync clears needs_reply when user replies)
- Dashboard "Pending Replies" metric (clickable → Action Required view)
- Snooze presets (1h, tomorrow AM/PM, next Monday, custom datetime)
- **Email CRM Filters** — filter Inbox/Sent/All Mail by Client, End-Client, Opportunity, Campaign with include/exclude toggle
- **Bulk Archive** — checkbox selection mode for batch archiving emails
- **Per-filter view caching** — switching between Inbox/Sent preserves fetched data
- **Gmail archive syncs to Supabase** — archive updates `gmail_threads.labels` in Supabase too
- **All Mail shows all synced threads** — uses Supabase data (not limited to one Gmail API page)
- **Gmail sync pagination** — syncs up to 500 threads, never misses emails after long gaps

### Entity Dashboard Architecture

All four entity types (Client, End-Client, Campaign, Opportunity) use a consistent full-screen tabbed modal pattern:

**Opening flow:**
1. Opener function (e.g. `openClientDetailModal(name)`) sets entity tracking state and resets tab to `'overview'`
2. Renders dashboard HTML into `gel('detail-body').innerHTML`
3. Adds `on` + `full-detail` classes to `detail-modal`
4. Calls `setTimeout(function(){initEntityCharts(type)}, 50)` for chart rendering

**Tab switching (critical pattern):**
- Tab setters (e.g. `setClientTab(tab)`) re-render `detail-body` innerHTML **directly** — they do NOT call `render()` which would close the modal
- Each setter: updates `S.xxxTab` → rebuilds entity data → sets `innerHTML` → inits charts via setTimeout

**Shared components:**
- `rEntityTabs(tabs, activeTab, setterFn)` — tab bar with `.cp-tabs` / `.cp-tab` / `.cp-tab.on` CSS classes
- `rContactEmailSelector(contacts, entityType, entityName)` — checkbox contact list → compose email
- `initEntityCharts(entityType)` — checks for canvases by ID prefix, creates Chart.js charts with live data
- `aiBox(id, config)` — AI assistant with entity-specific context and keywords

**Chart canvas IDs per entity:**

| Entity | Canvas ID | Chart Type | Data Source |
|--------|-----------|------------|-------------|
| Client | `ch-cl-revenue` | mkLineUSD | Monthly revenue from financePayments (12mo) |
| Client | `ch-cl-time` | mkDonut | Time tracked by category from done tasks |
| Client | `ch-cl-tasks` | mkLine | Daily task completions (30d) |
| Client | `ch-cl-pipeline` | mkDonutUSD | Pipeline value by opportunity stage |
| End-Client | `ch-ec-campaigns` | mkDonut | Campaigns by status |
| End-Client | `ch-ec-tasks` | mkLine | Task completions over time (30d) |
| Campaign | `ch-cp-revenue` | mkLineUSD | Monthly revenue collected vs expected |
| Campaign | `ch-cp-tasks` | mkHBar | Tasks by category |
| Campaign | `ch-cp-fees` | mkDonutUSD | Fee breakdown (strategy/setup/monthly/ad) |
| Opportunity | `ch-op-value` | mkDonutUSD | Value breakdown (strategy/setup/monthly) |
| Opportunity | `ch-op-prob` | mkDonut | Probability gauge (2-segment) |

**Contact Email Selector flow:**
1. Component renders with contact checkboxes (avatar, name, email, role)
2. "Select All" calls `cesToggleAll(selectorId, checked)`
3. "Compose Email" calls `cesCompose(selectorId, entityType, entityName)`
4. `cesCompose` collects checked emails, opens `openComposeEmail()` with pre-filled To, Subject, and CRM categorization

### End-Client Management

**Supabase table:** `end_clients` (UUID PK, user_id, name, client_id FK, notes, status, created_at, updated_at)

**Views:**
- `rEndClientsBody()` — directory with search, sortable columns, inline add/edit
- `rEcReviewBody()` — AI-powered candidate discovery

**EC Review flow:**
1. `discoverEcCandidates()` scans `S.contacts`, `S.gmailThreads`, `S.meetings` for addresses with ≥2 emails
2. Builds candidate list with email, name, client, email count, meeting count
3. Sends candidates + context to `POST /api/gmail/ec-suggest`
4. Claude AI groups candidates into end-client suggestions with confidence scores
5. Each suggestion can be accepted (creates end-client + updates contacts) or dismissed

**Key functions:** `loadEndClients()`, `dbAddEndClient()`, `dbEditEndClient()`, `dbDeleteEndClient()`, `discoverEcCandidates()`, `applyEcSuggestion()`, `dismissEcSuggestion()`

### Recent Changes

**Knowledge Base System (2026-03-07):**
- pgvector-powered RAG system with OpenAI text-embedding-3-small (1536 dims)
- `knowledge_chunks` and `knowledge_sources` tables with HNSW index
- Core library: `api/_lib/embeddings.js` (chunk, embed, store, search, dedup)
- 11 entity-type chunkers in `api/_lib/entity-chunkers.js`
- 10 API endpoints under `api/knowledge/` (search, AI Q&A, ingestion, stats, sync)
- Bulk embedding scripts: 53,000+ emails embedded from Gmail API
- Meeting embedding from Read.ai data
- `match_knowledge()` SQL function for cosine similarity search

**Full-Screen Tabbed Dashboard Overhaul (2026-03-07):**
- All 4 entity types (Client, End-Client, Campaign, Opportunity) now open as full-screen tabbed modals
- Each has an Overview tab with KPIs, charts, and AI assistant
- Contact email selector enables batch emailing from any entity
- Campaign unified to always use modal (removed desktop in-page branch)
- Opportunity converted from split-pane layout to tabbed modal
- Entity-specific Chart.js charts (11 charts across 4 entities)
- Tab CSS reuses existing `.cp-tabs` / `.cp-tab` / `.cp-tab.on` infrastructure

**End-Client & EC Review Feature (2026-03-06):**
- `end_clients` Supabase table with full CRUD
- End-Client directory view in Clients section
- EC Review: AI-powered end-client discovery from email/meeting patterns
- `POST /api/gmail/ec-suggest` endpoint using Claude Sonnet
- Clients navigation expanded: Active | Lapsed | End Clients | EC Review

**Email Enhancements (2026-03-05):**
- CRM filter bar on Inbox/Sent/All Mail with include/exclude toggles
- Bulk archive with checkbox selection mode
- Gmail sync pagination (5 pages × 100 = 500 threads max)
- Archive syncs to Supabase labels
- Per-filter view caching
- All Mail uses Supabase data (500 threads vs previous 25)
- Fetch limits: Inbox live 50, Gmail sync 200/page (5 pages), Supabase load 500
