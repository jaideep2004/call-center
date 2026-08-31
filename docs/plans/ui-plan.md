# Dashboard UI Plan

## Current Design Tokens (Brand)

| Variable | Value | Usage |
|----------|-------|-------|
| `--ground` | `#12071E` | Page background (deepest) |
| `--panel` | `#1F1037` | Card/panel surfaces |
| `--line` | `#3A225D` | Borders, dividers |
| `--ink` | `#FAFAFC` | Primary text |
| `--muted` | `#867E99` | Secondary text |
| `--acid` | `#A855F7` | Primary accent — COMMON to both |
| `--cyan` | `#60A5FA` | Secondary accent — used more in AGENT |
| `--amber` | `#F59E0B` | Warning/highlight |
| Fonts | Poppins (display), Inter (sans), JetBrains Mono (mono) | |

## Color Strategy

**Keep brand identity:** `#12071E` ground, `#A855F7` accent, `#FAFAFC` ink. The core brand colors stay in both dashboards.

**Differentiate via accent weight:**

| Element | Admin | Agent |
|---------|-------|-------|
| Sidebar active indicator | `--acid` (purple glow) | `--cyan` (blue glow) |
| Metric highlights | `--amber` for alerts | `--cyan` for earnings |
| Primary buttons | Purple gradient fill | Blue solid fill |
| Status band border | Purple tint | Blue tint |
| Section labels | "ADMIN" prefix | "AGENT" prefix |
| Nav active bg | Purple-tinted (`#2A184C`) | Blue-tinted (`#152A45`) |
| Sidebar accent line | Gold/amber (`#8a6a2f`) | Cyan (`--cyan`) |

The difference should be **felt, not shouted** — same brand, different atmosphere. Admin = authority (amber/gold accents on command plane). Agent = action (blue/cyan accents on live control).

---

## Dashboard Structure

### Role Hierarchy

```
super_admin ──→ Admin Dashboard (full access + user management)
     │
   admin ─────→ Admin Dashboard (full access)
     │
   agency ────→ Admin Dashboard (agency scope)
     │
  manager ────→ Admin Dashboard (read-only + assignments)
     │
  finance ────→ Finance-scoped view (wallet, reports)
     │
   agent ─────→ Agent Dashboard (take calls, wallet, reports)
```

---

### AGENT Dashboard (7 nav items)

```
┌──────────────────────────────────────┐
│  CALLRELAY           agent@domain    │  ← sidebar
│  ─────────────────────────────────── │     width: 220px
│  ◉ COMMAND           dashboard/      │     dark panel bg
│  ☏ TAKE CALLS        take-calls      │     active: cyan indicator
│  ⏏ CALLS             calls           │
│  ⊞ MY WALLET         wallet/agent    │
│  ◐ REPORTS           reports         │
│  🔔 NOTIFICATIONS    notifications   │
│  ⚙ SETTINGS         settings         │
│  ─────────────────────────────────── │
│  [Operator avatar]                   │
│  [Online/Offline toggle]             │  ← availability always visible
└──────────────────────────────────────┘
```

#### Home (Command) — Agent

```
┌─ STATUS BAR ──────────────────────────────────┐
│ ● YOU'RE ONLINE  │  3 agents available        │
│                  │  Wallet: $2,450            │
└───────────────────────────────────────────────┘

┌─ METRICS ─────────────────────────────────────┐
│ Calls Today  │  Live Now  │  Earned Today  │  Avg Rating  │
│     12       │     2      │    $84.50      │    4.8★      │
└───────────────────────────────────────────────┘

┌─ SOFT PHONE ───────┐  ┌─ ACTIVITY SPARKLINE ─────┐
│                     │  │  Calls this week          │
│   ☏  ONLINE         │  │  ▁▂▃▄▃▂▁  (mini chart)   │
│                     │  │  ▲ 12% vs last week      │
│   [Accept] [Hangup] │  │                           │
│                     │  │  ── EARNINGS ─────────   │
│   [Availability ▼]  │  │  ▁▂▃▅▄▃▄  (mini chart)   │
└─────────────────────┘  │  ▲ $84.50 today          │
                         └─────────────────────────┘

┌─ RECENT ACTIVITY ─────────────────────────────┐
│  ● Connected  CL-A3F2    12:34 — 4m 12s       │
│  ● Missed     CL-B7K1    12:12                 │
│  ● Connected  CL-D9M0    11:45 — 8m 30s       │
│  ● Connected  CL-F4G7    10:20 — 3m 15s       │
└───────────────────────────────────────────────┘
```

- **Sparkline charts** for calls trend and earnings trend directly on home page
- No full chart library needed — SVG sparklines are lightweight (or use tiny recharts)
- Softphone is the LARGEST element, charts are compact companions
- "Recent activity" feeds from live call data

#### Take Calls (full softphone)

- Large in-browser softphone UI
- Availability toggle (Online/Busy/Offline)
- Call timer, mute, hold, DTMF pad
- Active call info panel (caller, campaign, duration)
- Recent calls list on the side

#### Calls

- Personal call history table
- Columns: ID, From, Campaign, Duration, Status, Disposition, Timestamp
- Filters: date range, status, campaign
- Click row → call detail modal/page

#### My Wallet

- Balance card (prominent, large number)
- Earnings this week/month graph
- Transaction history table
- Top-up with Stripe (if agency allows agent top-ups)
- Withdraw button (if enabled)

#### Reports

- Personal metrics: calls taken, conversion rate, earnings trend
- Charts: calls/day, earnings/day, conversion rate
- Export to CSV

#### Notifications

- Notification list with read/unread state
- Click to mark read
- Clear all

#### Settings

- Profile info
- Password change
- Notification preferences
- Available states/licenses (read-only)

---

### ADMIN Dashboard (13 nav items in groups)

```
┌──────────────────────────────────────┐
│  CALLRELAY           admin@domain    │  ← sidebar
│  ─────────────────────────────────── │     width: 220px
│  ◉ COMMAND           dashboard/      │
│  ─── PEOPLE ──────────────────────── │  ← group divider
│  ⊞ AGENCIES          admin/agencies  │
│  ⊟ AGENTS            agents/         │
│  ─── OPERATIONS ──────────────────── │
│  ⊡ LEADS             leads/          │
│  ⊞ CAMPAIGNS         campaigns/      │
│  ☏ CALLS             calls/          │
│  ≡ RECORDINGS        recordings/     │
│  ≡ SCRIPTS           scripts/        │
│  ─── FINANCE ─────────────────────── │
│  ₿ PLANS             admin/plans     │
│  ⊞ WALLET            wallet/         │
│  ◐ REPORTS           reports/        │
│  ─── SYSTEM ──────────────────────── │
│  🔔 NOTIFICATIONS    notifications   │
│  ⚙ SETTINGS         settings/       │
│  ─────────────────────────────────── │
│  ⚡ ADMIN CONSOLE    admin/          │  ← separate section
│  [Operator avatar]                   │
└──────────────────────────────────────┘
```

#### Home (Command) — Admin

```
┌─ STATUS BAND ───────────────────────────────────┐
│ ⚡ ADMIN PANEL │ 24 agents online │ 7 campaigns  │
└──────────────────────────────────────────────────┘

┌─ METRICS ───────────────────────────────────────┐
│ Total Calls  │  Agents Online  │  Total Leads  │  Revenue  │
│    1,284     │      24         │     3,421     │  $48,200  │
└──────────────────────────────────────────────────┘

┌─ TREND CHARTS ──────────────────────────────────┐
│ ┌── 7-Day Call Volume ──┐  ┌── Revenue ────────┐ │
│ │  ▁▂▃▄▅▂▇  (bar chart)  │  │  ▁▂▃▄▅▆▇  (bar)   │ │
│ │  ▲ 23% vs last period  │  │  ▲ $48.2K cycle   │ │
│ └────────────────────────┘  └───────────────────┘ │
│ ┌── Conversion Rate ────┐  ┌── Avg Duration ────┐ │
│ │  ▁▂▃▂▄▃▅  (bar chart)  │  │  ▁▂▃▄▃▂▁  (bar)    │ │
│ │  68.2% this period     │  │  4m 32s avg        │ │
│ └────────────────────────┘  └───────────────────┘ │
└──────────────────────────────────────────────────┘

┌─ LIVE QUEUE ──────────────┐  ┌─ QUICK ACTIONS ────────┐
│  CL-A3F2  +1 312...  ROUT │  │  Manage Agents         │
│  CL-B7K1  +1 224...  CONN │  │  View Agencies         │
│  CL-D9M0  +1 773...  ROUT │  │  Create Campaign       │
│  CL-F4G7  +1 847...  MISS │  │  Recruit Agents        │
└───────────────────────────┘  └───────────────────────┘
```

- **4 mini bar charts** on admin home: call volume, revenue, conversion rate, avg duration
- These use the same `recharts` library (already lazy-loaded) — small 160px tall charts
- Live queue feeds from real-time call data
- Quick actions + performance snapshot at a glance
```

#### Agencies (admin/agencies/)

- Table: name, agents count, status, created date, revenue
- Click → agency detail page (agents, calls, wallet for that agency)
- New agency form

#### Agents (agents/)

- Table: name, email, agency, status (online/offline), calls today, earnings
- Filters: agency, status, license type
- Click → agent detail (profile, call history, earnings, subscription)

#### Leads (leads/)

- Table: phone hash, source, status, assigned agent, campaign, created
- Filters: status, source, date range, assigned agent
- Click → lead detail with timeline, notes, tags

#### Campaigns (campaigns/)

- Table: name, status, target states, routing strategy, price, created
- New campaign form
- Click → campaign detail (edit, stats, calls from this campaign)

#### Calls (calls/)

- Full call history
- Table: ID, agent, from, campaign, duration, status, disposition, cost, timestamp
- Filters: agent, campaign, status, date range
- Export to CSV
- Click → call detail (recording, transcript, timeline, billing)

#### Recordings (recordings/)

- Table: call ID, agent, duration, created, download link
- Filters: date range, agent
- Playback inline in browser

#### Scripts (scripts/)

- Table: title, category, created, updated
- CRUD: create/edit/delete scripts
- Markdown editor for script content

#### Plans (admin/plans/)

- Table: name, price, features, status
- CRUD for subscription plans
- Used when agents subscribe to a plan

#### Wallet (wallet/)

- Agency-level wallet (not agent)
- Balance card
- Stripe top-up (admin can add funds)
- Transaction history
- Invoice list

#### Reports (reports/)

- Full analytics suite
- Charts: calls volume, revenue, conversion rate, avg duration
- Date range selector
- Export to CSV
- Same page for both admin and agent (admin sees all, agent sees personal)

#### Notifications (notifications/)

- Same as agent but can receive admin-specific notifications

#### Settings (settings/)

- Agency profile
- Members list
- Phone numbers management
- API keys/webhooks
- Billing info

#### Admin Console (admin/)

- Separate section (visually distinct in sidebar)
- System overview
- User management
- Disposition review
- Platform health

---

## Page-by-Page Specification

### Shared Layout Principles

| Element | Pattern |
|---------|---------|
| Page header | Eyebrow label + h1 title + optional actions (right-aligned) |
| Status band | Thin colored bar below header with key live stats |
| Metrics row | 4-card grid showing key numbers |
| Tables | Uniform: sticky header, monospaced data, hover rows |
| Cards | `--panel` bg, `--line` border, 12px radius |
| Empty states | Centered message + CTA button |
| Loading | Skeleton shimmer (animated gradient) |
| Modals | Centered, `--panel` bg, backdrop blur, ESC to close |

### Table Standard

- Header: `font: 10px var(--mono)`, uppercase, `--muted` color
- Rows: `font: 12px`, `--ink` color, `--line` dividers
- Hover: `--panel` tint
- Clickable rows: cursor pointer, subtle highlight
- Pagination: bottom-right, "Showing 1-25 of 100" + page controls

### Form Standard

- Labels above inputs, `font: 11px var(--mono)`, `--muted`
- Input bg: `--ground`, border: `--line`, focus: `--acid` or `--cyan`
- Validation: inline error messages below fields
- Submit buttons: acid green outline (admin) or teal solid (agent)

---

## Visual Differentiation Summary

| Element | Admin | Agent |
|---------|-------|-------|
| Sidebar active accent | `--acid` green left border | `--cyan` teal left border |
| Sidebar active background | `#162019` (green tint) | `#16322e` (teal tint) |
| Primary button style | Acid outline (`--acid` border, transparent bg) | Teal solid (`--cyan` bg, dark text) |
| Status band style | Green-tinted border | Teal-tinted border |
| Section labels | `font: 10px var(--mono)`, uppercase, acid dot | `font: 10px var(--mono)`, uppercase, cyan dot |
| Metric highlight color | Orange for anomalies | Cyan for positive movement |
| Data density | Higher (more columns, tighter rows) | Moderate (cards, readable) |
| Home page | Queue + agency overview | Softphone + earnings |
| Sidebar content | Grouped with section headers | Flat list, no groups needed |
| Special nav item | "Admin Console" with amber/gold accent | None |

---

## Phase-Wise Implementation Plan

---

### Phase 1: Foundation — Design Tokens & Theme Switching

**Goal:** Set up the CSS infrastructure so admin/agent dashboards render different accent colors. No visual change visible yet, just the mechanism.

| Task | Files | Details |
|------|-------|---------|
| 1.1 Add role class to body | `dashboard/layout.tsx` | Set `data-role="admin"` or `data-role="agent"` on `<body>` based on user role |
| 1.2 Create role-specific CSS variables | `styles/tokens.css` | Add `[data-role="admin"]` and `[data-role="agent"]` overrides that shift `--accent`, `--accent-glow`, `--accent-bg` |
| 1.3 Refactor existing CSS | `styles/dashboard.css`, `globals.css` | Replace raw `--acid`/`--cyan` references with `--accent` where role-appropriate |
| 1.4 Admin Console amber accent | `styles/dashboard.css` | Keep amber/gold (`#b89b3a`) for Admin Console nav item regardless of role |
| 1.5 Verify no regressions | — | Build + visual check both dashboard home pages load |

**Estimated effort:** Small (2-3 hours)

---

### Phase 2: Sidebar Restructure

**Goal:** Grouped nav with section dividers for admin; flat list for agent.

| Task | Files | Details |
|------|-------|---------|
| 2.1 Define nav groups | `dashboard/layout.tsx` | Split `adminNav` into groups: PEOPLE, OPERATIONS, FINANCE, SYSTEM |
| 2.2 Render section dividers | `dashboard/layout.tsx` | Add group label rows (e.g., `── PEOPLE ──`) in sidebar between nav groups |
| 2.3 Agent sidebar cleanup | `dashboard/layout.tsx` | Agent nav stays flat, add cyan active indicator |
| 2.5 Active state polish | `styles/dashboard.css` | Active link: accent-left-border + tinted bg, smooth transition |
| 2.6 Responsive sidebar | `styles/dashboard.css` | Collapse to icon-only on <850px, tooltip on hover |

**Estimated effort:** Medium (4-6 hours)

---

### Phase 3: Agent Dashboard Home Page

**Goal:** Softphone-first home with activity sparks and recent calls.

| Task | Files | Details |
|------|-------|---------|
| 3.1 Fetch agent home data | `dashboard/page.tsx` | Add `GET /api/v1/reports/duration?days=7`, `GET /api/v1/calls?agent_id=X&limit=5` |
| 3.2 Softphone prominence | `dashboard/page.tsx` | Softphone panel on left (55% width), activity + charts on right (45%) |
| 3.3 Sparkline components | `components/sparkline.tsx` | New tiny SVG chart component (no recharts dependency — pure SVG `<polyline>`) |
| 3.4 Earnings sparkline | `dashboard/page.tsx` | 7-day earnings trend rendered with sparkline |
| 3.5 Calls sparkline | `dashboard/page.tsx` | 7-day call volume trend rendered with sparkline |
| 3.6 Recent activity list | `dashboard/page.tsx` | Last 5 calls with status, duration, timestamp |
| 3.7 Online/offline toggle | `dashboard/page.tsx` | Prominent toggle in softphone panel, calls API on change |
| 3.8 Empty states | `dashboard/page.tsx` | No calls yet → "Ready for your first call? Go online above" |

**Estimated effort:** Large (8-12 hours)

---

### Phase 4: Admin Dashboard Home Page

**Goal:** Data-rich command center with 4 mini charts, live queue, and quick actions.

| Task | Files | Details |
|------|-------|---------|
| 4.1 Fetch admin home data | `dashboard/page.tsx` | Add volume, revenue, conversion, duration report fetches in parallel |
| 4.2 Mini chart grid (2x2) | `dashboard/page.tsx` | Use `recharts` BarChart (already lazy-loaded) — 4 compact 160px charts |
| 4.3 Live queue from API | `dashboard/page.tsx` | Fetch `/api/v1/calls?state=ringing,connected&limit=5` (already done) |
| 4.4 Quick actions panel | `dashboard/page.tsx` | Links to Manage Agents, View Agencies, Create Campaign, Recruit |
| 4.5 Status band refresh | `dashboard/page.tsx` | Show live counts: agents online, active campaigns, pending dispositions |
| 4.6 Widget reload timer | `dashboard/page.tsx` | Auto-refresh queue every 10s (with backoff when tab hidden) |

**Estimated effort:** Medium (6-8 hours)

---

### Phase 5: List Pages Standardization

**Goal:** Every table page (Calls, Leads, Campaigns, Agents, Agencies, Scripts, Plans, Recordings) has consistent layout, filtering, pagination.

| Task | Files | Details |
|------|-------|---------|
| 5.1 Shared table component | `components/data-table.tsx` | New reusable component: header, rows, sort, pagination, empty state, loading skeleton |
| 5.2 Refactor Calls page | `dashboard/calls/page.tsx` | Use `<DataTable>`, add date range + status + agent filters |
| 5.3 Refactor Leads page | `dashboard/leads/page.tsx` | Use `<DataTable>`, add source + status + date filters |
| 5.4 Refactor Campaigns | `dashboard/campaigns/page.tsx` | Use `<DataTable>`, status toggle |
| 5.5 Refactor Agents | `dashboard/agents/page.tsx` | Use `<DataTable>`, agency + status filters |
| 5.6 Refactor Agencies | `dashboard/admin/agencies/page.tsx` | Use `<DataTable>` |
| 5.7 Refactor Recordings | `dashboard/recordings/page.tsx` | Use `<DataTable>`, inline audio playback |
| 5.8 Refactor Scripts | `dashboard/scripts/page.tsx` | Use `<DataTable>` |
| 5.9 Refactor Plans | `dashboard/admin/plans/page.tsx` | Use `<DataTable>` |

**Estimated effort:** Large (10-16 hours)

---

### Phase 6: Empty States & Loading Patterns

**Goal:** Every page has skeleton loading, empty state with CTA, and error state.

| Task | Files | Details |
|------|-------|---------|
| 6.1 Skeleton component | `components/skeleton.tsx` | Variants: text, card, table-row, chart-bar |
| 6.2 Empty state component | `components/empty-state.tsx` | Icon + message + optional CTA button |
| 6.3 Error state component | `components/error-state.tsx` | Error icon + message + retry button |
| 6.4 Apply to all list pages | All `page.tsx` files | Wrap each page's data fetch in loading/error pattern |
| 6.5 Softphone loading | `components/softphone.tsx` | WebRTC connecting state with spinner |

**Estimated effort:** Medium (4-6 hours)

---

### Phase 7: Agent Wallet & Reports Polish

**Goal:** Agent-specific wallet view with earnings breakdown, and agent-filtered reports.

| Task | Files | Details |
|------|-------|---------|
| 7.1 Agent wallet redesign | `dashboard/wallet/agent/page.tsx` | Big balance number, earnings this period, mini chart, top-up button |
| 7.2 Agent reports filter | `dashboard/reports/page.tsx` | Auto-filter by current agent when role=agent |
| 7.3 Earnings chart | `dashboard/wallet/agent/page.tsx` | 30-day earnings bar chart using `recharts` |
| 7.4 Withdraw flow | `dashboard/wallet/agent/page.tsx` | Request payout button + history |

**Estimated effort:** Medium (4-6 hours)

---

### Phase 8: Admin Finance Pages Polish

**Goal:** Wallet, Plans, Invoices — clean financial UI with proper data display.

| Task | Files | Details |
|------|-------|---------|
| 8.1 Agency wallet redesign | `dashboard/wallet/page.tsx` | Total balance, Stripe top-up, transaction list, date range filter |
| 8.2 Plans CRUD polish | `dashboard/admin/plans/page.tsx` | Feature list display, price formatting, status toggle |
| 8.3 Invoices list | `dashboard/wallet/invoices/page.tsx` | Table with status badges, download link, date range filter |
| 8.4 Invoice detail | `dashboard/wallet/invoices/[id]/page.tsx` | Full invoice view with call breakdown |

**Estimated effort:** Medium (6-8 hours)

---

### Phase 9: Detail Pages (Agent Detail, Call Detail, Lead Detail)

**Goal:** Consistent detail page layout across all entities.

| Task | Files | Details |
|------|-------|---------|
| 9.1 Agent detail | `dashboard/agents/[id]/page.tsx` | Profile card + call history table + earnings summary + subscription info |
| 9.2 Call detail | `dashboard/calls/[id]/page.tsx` | Call info panel + recording player + timeline + billing info + disposition |
| 9.3 Lead detail | `dashboard/leads/[id]/page.tsx` | Lead info + timeline + notes + tags |
| 9.4 Campaign detail | `dashboard/campaigns/[id]/page.tsx` | Settings + stats + calls from campaign |
| 9.5 Membership detail | `dashboard/membership/[id]/page.tsx` | User info + permissions + activity |

**Estimated effort:** Large (10-14 hours)

---

### Phase 10: Mobile & Responsive

**Goal:** All dashboard pages usable on tablet and phone.

| Task | Files | Details |
|------|-------|---------|
| 10.1 Mobile sidebar | `styles/dashboard.css` | Bottom tab bar on mobile, collapse sidebar |
| 10.2 Responsive metrics | `styles/dashboard.css` | 4-col → 2-col → 1-col based on viewport |
| 10.3 Responsive tables | `styles/dashboard.css` | Horizontal scroll on narrow screens |
| 10.4 Softphone mobile | `components/softphone.tsx` | Full-screen softphone on mobile, bottom sheet for controls |
| 10.5 Touch targets | All | Minimum 44px touch targets on all interactive elements |
| 10.6 Test breakpoints | — | Verify at 320px, 480px, 768px, 1024px, 1440px |

**Estimated effort:** Medium (6-10 hours)

---

## Effort Summary

| Phase | Area | Est. Hours | Priority |
|-------|------|-----------|----------|
| 1 | Theme tokens | 2-3 | 🔴 Must-have |
| 2 | Sidebar groups | 4-6 | 🔴 Must-have |
| 3 | Agent home page | 8-12 | 🔴 Must-have |
| 4 | Admin home page | 6-8 | 🔴 Must-have |
| 5 | Table standardization | 10-16 | 🟡 High |
| 6 | Empty/loading states | 4-6 | 🟡 High |
| 7 | Agent wallet/reports | 4-6 | 🟡 High |
| 8 | Admin finance pages | 6-8 | 🟢 Medium |
| 9 | Detail pages | 10-14 | 🟢 Medium |
| 10 | Mobile responsive | 6-10 | 🟢 Medium |
| **Total** | | **60-89** | |

**Phases 1-4 = ≈22 hours core UI overhaul. Phases 5-10 = polish + depth.**
