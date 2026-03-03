# TaskFlow — Project Guide for Claude Code

## What is TaskFlow?

TaskFlow is a comprehensive task management and business operations platform built for Tim Jarvis, who runs two LLCs:
- **Tim Jarvis Online LLC** — banking via Brex
- **Film&Content LLC** — banking via Mercury, accounting via Zoho Books, payment processing via Zoho Payments

It manages tasks, projects, campaigns, sales (opportunities), clients, finance (payments, invoices, recurring expenses, forecasting, team payroll), and daily scheduling in a single-page app.

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
│   ├── core.js             # State (S), data loading, CRUD helpers, timers, filters, reconciliation
│   ├── views.js            # All view rendering (rDashboard, rToday, rTasks, rFinance, etc.)
│   ├── modals.js           # All modal UIs (detail, add, done, campaigns, finance, projects, opportunities, team, scheduled items)
│   ├── features.js         # Focus mode, command palette, drag & drop, scheduling, meeting tracking, calendar sync
│   └── app.js              # TF function registry (window.TF = {...})
│
├── css/
│   ├── core.css            # CSS variables, layout, sidebar, typography, sub-nav badges
│   ├── components.css      # Cards, badges, buttons, forms, tables (compact task rows)
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
│   ├── schema.sql                  # Core schema (tasks, done, review, clients, campaigns, projects, opportunities, etc.)
│   ├── add-finance.sql             # finance_payments, payer_client_map tables
│   ├── add-finance-splits.sql      # finance_payment_splits table
│   ├── add-finance-integrations.sql # integration_credentials, sync_log tables
│   ├── add-finance-forecast.sql    # account_balances, scheduled_items, team_members tables
│   ├── add-scheduled-item-link.sql # scheduled_item_id FK on finance_payments
│   ├── add-campaign-billing.sql    # Campaign billing metadata columns
│   ├── add-finance-overhaul.sql    # Enhanced team_members (commission), scheduled_items (end_date/num_payments), opportunities (payment/fees)
│   ├── add-activity-logs.sql       # activity_logs table
│   └── add-meeting-key.sql         # meeting_key column on tasks
│
└── scripts/
    ├── run-migration.py    # Helper to run SQL migrations
    ├── fix-null-dates.py   # Utility for fixing null date issues
    ├── import-finance.js   # Finance data import (JS)
    └── import-finance.py   # Finance data import (Python)
```

## Client-Side Architecture

### Navigation Structure

The main navigation is defined by `SECTIONS` in `core.js`. Sections are ordered as follows:

| # | ID | Label | Kbd | Sub-views |
|---|-----|-------|-----|-----------|
| 1 | `dashboard` | Dashboard | 1 | — |
| 2 | `today` | Schedule | 2 | Suggested Schedule (default), Today's Schedule, Meeting Prep, Analytics, Daily Summary, Weekly Summary, Weekly Capacity |
| 3 | `tasks` | Tasks | 3 | Open Tasks, Completed, Review Queue (with badge) |
| 4 | `opportunities` | Sales | 4 | Analytics, Retain Live, F&C Partnerships, F&C Direct, Profitability |
| 5 | `campaigns` | Campaigns | 5 | Pipeline, List, Performance |
| 6 | `projects` | Projects | 6 | Board, List, Timeline |
| 7 | `clients` | Clients | 7 | Active, Lapsed |
| 8 | `finance` | Finance | 8 | Overview, Transactions, Invoices, Upcoming, Recurring, Cash Flow, Forecast, Team, Dashboard |

**Mobile bottom tabs** (`MOB_VIEWS`): Add, Tasks, Review, Opps

### ICONS Map

The `ICONS` object in `core.js` maps icon names to Lucide SVG paths. Commonly used icons include:
- Navigation: `dashboard`, `calendar`, `tasks`, `gem`, `megaphone`, `folder`, `clients`, `dollar`
- Sub-nav: `users`, `briefcase`, `bar_chart`, `sun`, `layers`, `activity`, `today`, `check`, `inbox`, `zap`
- UI: `plus`, `edit`, `trash`, `clock`, `arrow_left`, `search`, `star`

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
  accountBalances: [],    // Live bank account balance snapshots
  scheduledItems: [],     // Recurring expenses, subscriptions, vendor payments
  teamMembers: [],        // Team payroll/commission data

  // UI state
  view: 'dashboard',      // Current view — default is dashboard (was 'dash' previously)
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
  clientDetailName: '',   // When set, renders full-screen client dashboard instead of directory

  // Bulk operations
  bulkMode: false,        // Bulk selection active
  bulkSelected: {},       // Selected task IDs

  // Focus mode
  focusTask: null,        // Currently focused task ID
  focusDuration: 25,      // Focus session duration (minutes)

  // Finance UI state
  finFilter: '',          // '' | 'unmatched' | 'matched' | 'expenses' (note: 'split' merged into 'matched')
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
render() → rDashboard() | rToday() | rTasks() | rFinance() | rCampaigns() | rProjects() | rOpportunities() | rClients()

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

Tasks sub-views:
  rTasks()                 — Open tasks (compact rows with filter bar)
  (completed)              — Completed tasks list
  (review)                 — Review queue with badge count in sub-nav

Sales (Opportunities) sub-views (via rOpportunities() dispatcher):
  rOpportunitiesBody()     — Analytics dashboard (default)
  rOppTypeSection()        — Per-type pipeline views (Retain Live, F&C Partnerships, F&C Direct)
  rOppProfitabilityDashboard() — Combined profitability dashboard across all types

Finance sub-views (via rFinance() dispatcher):
  rFinanceOverview()       — High-level overview with expandable bank account cards (deduped transactions)
  rFinancePayments()       — Transaction list (Unmatched/Matched tabs — Split merged into Matched)
  rFinanceInvoices()       — Invoice records from Zoho Books
  rFinanceUpcoming()       — Projected upcoming payments, expense reconciliation review
  rFinanceRecurring()      — Recurring expenses, subscriptions, vendor payments
  rFinanceCashFlow()       — Cash flow analysis and projections
  rFinanceForecast()       — Cash flow forecast with compact toolbar (horizon/scenario/sources/account)
  rFinanceTeam()           — Payroll, commissions, team member costs
  rFinanceDashboard()      — Summary metrics, charts

Campaigns sub-views:
  rCampaignPipeline()      — Kanban-style pipeline
  rCampaignList()          — Table view
  rCampaignPerformance()   — Performance charts/metrics

Projects sub-views:
  rProjectBoard()          — Kanban board by phase
  rProjectList()           — Table view
  rProjectTimeline()       — Gantt timeline

Clients:
  rClients()               — Active/Lapsed directory with 6 columns (Client, Status, Revenue, Open Tasks, Time Tracked, Last Activity)
  rClientDashboard()       — Full-screen client dashboard (when S.clientDetailName is set)

Mobile views:
  rMobAdd()                — Quick add task
  rMobTasks()              — Task list
  rMobReview()             — Review queue with approve/review cards
  rMobOpportunities()      — Opportunities list
```

### Key View Functions

- **`buildClientMap()`** — Shared helper that aggregates client data (revenue, tasks, time, campaigns, opportunities, meetings, payments) while filtering out "Internal" and "N/A" entries. Used by both `rClients()` and `rDashboard()`.
- **`buildSubNav(subs)`** — Renders sub-navigation panel. Shows a badge with review count when `sub.id === 'review'` and `S.review.length > 0`.
- **`filterBar()`** — Renders compact filter controls (client, category, importance, type, search, date range). Uses 11px font, 6px border-radius pills.

### Function Registry

All functions callable from HTML `onclick` handlers are registered on `window.TF`:

```javascript
window.TF = { nav, load, start, pause, openDetail, addTimeToTask, openClientDashboard, closeClientDashboard, openAddMeetingPrepTask, ... }
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
- `scheduleTasks()` — AI scheduling engine that slots tasks into free calendar gaps
- `taskScore(task)` — Priority scoring for task ordering
- `oppTypeMetrics(typeKey)` — Per-type opportunity statistics
- `buildUpcomingPayments(horizon)` — Builds projected inflows/outflows for forecast

### Opportunity Types (OPP_TYPES)

Defined in `core.js`, each opportunity type has a key, label, color, and icon:
- `retain_live` — "Retain Live" (blue, users icon)
- `fc_partnership` — "F&C Partnerships" (purple, briefcase icon) — note: plural
- `fc_direct` — "F&C Direct" (amber, zap icon)

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
- `linkExpenseToScheduled(paymentId, scheduledItemId)` — links an expense to an existing recurring item, updates last paid date and advances next due
- `saveExpenseAsOneOff(paymentId)` — creates a one-off scheduled item (`frequency:'once'`) and auto-links the expense to it
- `autoReconcile()` — bulk auto-matching of expenses to scheduled items
- Expense Reconciliation Review card in Upcoming tab shows reconciled vs unreconciled counts with totals

### Finance Overview

The Finance Overview (`rFinanceOverview()`) shows expandable bank account cards:
- **Tim Jarvis Online (Brex)** — card + cash accounts
- **Film&Content (Mercury)** — checking account
- **Film&Content (Zoho Payments)** — payment balance

Each card expands to show recent transactions filtered by account source.

### Scheduled Items / Recurring Expenses

Managed via `scheduledItems[]` array. Each item has:
- `name`, `amount`, `direction` (inflow/outflow), `frequency` (monthly/quarterly/annual/once)
- `dayOfMonth`, `nextDue`, `lastPaidDate`, `endDate`, `numPayments`
- `category`, `account`, `type` (expense/subscription), `isActive`

Used in: Upcoming projections, Forecast calculations, Expense reconciliation matching.

### Team Members / Payroll

Managed via `teamMembers[]` array. Each member has:
- `name`, `role`, `salary`, `payFrequency`, `payDay`
- `commissionRate`, `commissionBasis`, `commissionFrequency`, `commissionCap`
- `startDate`, `isActive`

Used in: Upcoming salary projections, Team cost view, Forecast calculations.

### Cash Flow Forecast

`rFinanceForecast()` provides configurable cash flow forecast with:
- **Compact toolbar** (single row): Horizon segmented control (30/60/90/180/365d), Scenario toggle (Conservative/Expected/Optimistic), collapsible Sources section with pill toggles, Account dropdown
- Builds projected inflows/outflows from all sources via `buildUpcomingPayments(horizon)`
- Both balance and cash flow charts include tooltip callbacks with USD formatting

### Transactions View

`rFinancePayments()` shows transactions with tabs:
- **Unmatched** — payments needing client association
- **Matched** — matched payments (includes split records; Split was merged into this tab)
- **Expenses** — outflow payments

The `finFilteredPayments()` function in `core.js` handles filtering. When `S.finFilter === 'matched'`, it includes both `status === 'matched'` and `status === 'split'`.

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
- `tasks` — active tasks with due dates, importance, client, campaign, project, opportunity associations, meeting_key, duration
- `done` — completed tasks (moved from tasks on completion)
- `review` — items to review/approve before becoming tasks
- `clients` — client/partner records
- `campaigns` — marketing campaign records with fees, dates, links, billing frequency/terms
- `projects` — project records with phases
- `project_phases` — ordered phases within projects
- `opportunities` — sales pipeline items with payment method, processing fees, receiving account, expected monthly duration
- `payments` — campaign-related payment records
- `campaign_meetings` — meeting records linked to campaigns
- `activity_logs` — per-task log entries

### Finance Tables
- `finance_payments` — all financial transactions from all sources (direction, type, external_status, scheduled_item_id, expected_payment_date)
- `finance_payment_splits` — split payment allocations
- `payer_client_map` — auto-matching rules (payer email/name → client)
- `integration_credentials` — API keys and OAuth tokens per platform
- `sync_log` — audit trail for all sync operations
- `account_balances` — live snapshots of bank account balances (platform, account_id, current/available balance)
- `scheduled_items` — recurring expenses/subscriptions (frequency, day_of_month, next_due, last_paid_date, end_date, num_payments, is_active)
- `team_members` — payroll data (salary, pay_frequency, pay_day, commission_rate, commission_basis, commission_frequency, commission_cap, start_date, is_active)

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
- **Reconciliation**: `linkExpenseToScheduled()`, `unlinkExpenseFromScheduled()`, `saveExpenseAsOneOff()`, `getExpenseAccount()`, `scoreExpenseMatch()`

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
- **Cron**: Vercel Hobby plan doesn't support crons. The `api/cron/sync-all.js` endpoint exists but is **not currently called** — external cron was disabled due to deployment issues. All platform syncs are manual only via "Sync Now" buttons.

## Coding Conventions

1. **No frameworks** — vanilla JS only, no React/Vue/etc.
2. **No build step** — files served as-is
3. **Global state** — everything on `S` object
4. **String HTML** — views build HTML strings, not DOM nodes
5. **Semicolons optional** — code uses semicolons inconsistently (ok either way)
6. **Function names** — camelCase, registered on `window.TF` for HTML access
7. **CSS variables** — defined in `css/core.css` (--t1, --t2, --t3, --t4, --bg, --bg1, --green, --red, --blue, --purple50, --pink, --gborder, --r, etc.)
8. **No TypeScript** — all vanilla JS
9. **API endpoints** — CommonJS modules, `module.exports = async function handler(req, res)`
10. **Supabase client-side** — uses `_sb` global from config.js (anon key + RLS)
11. **Supabase server-side** — uses `getServiceClient()` from `api/_lib/supabase.js` (service key, bypasses RLS)
12. **Modal pattern** — build HTML string → `gel('m-body').innerHTML = h` → `gel('modal').classList.add('on')`
13. **Toggle pattern** — modal sections use `modalToggle(id)` with `dt-*` checkbox IDs to show/hide field groups

## Common Tasks

### Adding a new view
1. Add render function `rNewView()` in `views.js`
2. Add navigation case in `render()` function in `core.js`
3. Add nav item in `buildNav()` in `views.js`

### Adding a new sub-view
1. Add sub entry to the parent section in `SECTIONS` array (`core.js`)
2. Add the icon to `ICONS` map if not already present
3. Add render function in `views.js`
4. Add case in the parent's dispatcher (e.g., `rToday()`, `rFinance()`, `rOpportunities()`)
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

### Adding a new finance sub-view
1. Add render function `rFinanceNewTab()` in `views.js`
2. Add tab in the finance sub-nav builder in `rFinance()`
3. Add case in `rFinance()` dispatcher

### Adding a new entity (e.g., like scheduled items)
1. Add DB helper functions in `core.js` (`dbAdd/dbEdit/dbDelete`)
2. Add load function and call from `loadData()`
3. Add modal functions in `modals.js` (open, save, delete)
4. Add render in `views.js`
5. Register all functions in `window.TF` in `app.js`
6. Create SQL migration in `supabase/`

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
- Client select dropdowns include a blank "Select..." first option to prevent defaulting to first client
- `saveDetail()` and `markAlreadyCompleted()` check the client toggle checkbox before reading client value — if unchecked, client is cleared
- `dbCompleteTask()` calls `taskData.due.toISOString()` — due must be a Date object or null, never a string
- `approveFromModal()` wraps the entire flow in try/catch to always re-enable buttons on error
- Critical tasks in the calendar timeline use RED (`rgba(239,68,68,0.28)`) — distinct from meeting pink (`rgba(255,0,153,0.2)`)
- Sub-nav panel has `overflow-y:auto` when open to prevent clipping when sections have many subs (e.g., Schedule has 7, Finance has 9)
- `buildClientMap()` filters out "Internal" and "N/A" client names from all client views and dashboards
- The Finance Transactions view has no separate Split tab — split records are included in the Matched tab via `finFilteredPayments()`

## Current Status (as of 2026-03-03)

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
- Finance section fully operational: overview (with dedup), transactions (split merged into matched), invoices, upcoming, recurring, cash flow, forecast (with tooltips + compact toolbar), team
- Projects with phases, board/list/timeline views
- Sales pipeline (renamed from Opportunities) with Profitability as own sub-section
- Expense reconciliation with auto-match, manual link, and one-off save
- Focus mode, command palette, drag & drop scheduling
- Meeting auto-tracking from Google Calendar
- Manual time entry for active tasks (Add Time feature)
- Task detail client toggle properly clears client when unchecked
- Add & Complete for review/suggested tasks working with proper Date handling
- Dashboard as first nav item with comprehensive overview (today's focus, productivity, pipeline, finance, clients, heatmap, charts)
- Schedule section with 7 sub-views: Suggested Schedule (default), Today's Schedule, Meeting Prep (enhanced with all meetings), Analytics (heatmap + charts), Daily Summary (inline), Weekly Summary (comparisons), Weekly Capacity
- Clients with Active/Lapsed filtering, simplified 6-column directory, full-screen client dashboard on click
- Review queue badge in Tasks sub-nav
- Mobile bottom tabs: Add, Tasks, Review, Opps
- Compact task rows (36px min-height) with clean filter bar styling

### Recent Changes (commit 2466fa5)
- **Navigation**: Dashboard moved to first position (kbd 1), Opportunities renamed to Sales (kbd 4)
- **Dashboard**: Complete redesign — today's focus, productivity KPIs, sales pipeline, finance snapshot, clients summary, activity heatmap, 4 analytical charts
- **Schedule**: 4 new sub-views (Analytics, Daily Summary, Weekly Summary, Today's Schedule), Meeting Prep enhanced with all forthcoming meetings
- **Sales**: Profitability moved to own sub-section with combined dashboard, F&C Partnership→Partnerships (plural)
- **Clients**: Active/Lapsed sub-nav replaces Directory/Analytics, full-screen client dashboard, Internal/N/A filtered out, simplified 6-column directory
- **Tasks**: Thinner compact rows (36px), compact filter bar, review badge in sub-nav
- **Finance**: Overview dedup (zoho_books filter + date+amount), forecast tooltips, compact forecast toolbar, Split tab removed (merged into Matched), Upcoming clickability fixed
- **Mobile**: Review tab replaces Schedule in bottom tabs
- **CSS**: Critical tasks show red (not pink) in calendar, sub-nav overflow-y:auto for scrollability
- **Icons**: Added users, briefcase, bar_chart, sun, layers, arrow_left to ICONS map
