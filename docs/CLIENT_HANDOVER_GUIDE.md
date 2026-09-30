# Coverage Calls — Client Handover Guide

**Welcome!** This guide explains how to use and test every part of the Coverage Calls platform, in plain language. No technical knowledge needed.

- **Website:** `https://coveragecalls.com`
- **Login page:** `https://coveragecalls.com/login`
- **Sign-up page:** `https://coveragecalls.com/register`

---

## Table of Contents

1. [The big picture — 3 dashboards](#1-the-big-picture--3-dashboards)
2. [Accounts, roles & getting in](#2-accounts-roles--getting-in)
3. [Admin Console (full walkthrough)](#3-admin-console-full-walkthrough)
4. [Agent Console (full walkthrough)](#4-agent-console-full-walkthrough)
5. [Publisher Portal (full walkthrough)](#5-publisher-portal-full-walkthrough)
6. [End-to-end test scripts](#6-end-to-end-test-scripts)
7. [Money rules in plain English](#7-money-rules-in-plain-english)
8. [Troubleshooting FAQ](#8-troubleshooting-faq)
9. [Glossary](#9-glossary)

---

## 1. The big picture — 3 dashboards

Coverage Calls connects **buyers** (insurance agencies running campaigns) with **agents** (people who answer calls) and **publishers** (partners who send calls in). There are three dashboards:

| Dashboard | Who uses it | What it's for |
|---|---|---|
| **Admin Console** | You (the platform owner) | Manage everything: agencies, agents, users, campaigns, publishers, calls, money, website content, settings |
| **Agent Console** | Agents + agency heads | Take calls, join campaigns, manage wallet & subscriptions, view scripts/trainings, manage their team |
| **Publisher Portal** | Traffic partners | Get tracking links, watch calls/earnings, see payouts |

One email = one account. A person never needs two logins — if someone changes jobs (e.g. agent becomes publisher), their **role is switched on the same account** when they accept the new invite.

---

## 2. Accounts, roles & getting in

### The three roles

- **Admin** — full platform access. Sees the Admin Console.
- **Agent** — answers calls. Agency heads are agents with extra powers over their own team (no separate role).
- **Publisher** — sends calls through tracking links and earns per qualified call.

### Signing up (test this first)

1. Open `/register`.
2. Enter **full name, email, password** (minimum 8 characters; the eye icon shows/hides the password).
3. Click **Create account**. You'll land on a **Verify** page — check the inbox and click the verification link.
4. **Try signing up again with the same email** — it is rejected. One email can never register twice or hold two roles at once.

### Accepting an invite

- Invite links look like `/register?invite=...`. The page title changes to **Join Coverage Calls** and shows a warning: *accepting sets your account role to match the inviting company* (you may lose your old console — this is normal).
- Fill the same form, verify email, and you're in with the new role.

### Logging in

- `/login` → email + password → **Sign in**. Wrong details show an error message.
- **Forgot password?** sends a reset email.

### First ever admin (one-time setup)

1. Register the very first account, verify, sign in.
2. Open `/setup`. It shows your name, email and user ID.
3. Click **Promote to Super Admin** → you become admin and go to the dashboard.
4. (There's a **Skip** link if you want to look around first.)

---

## 3. Admin Console (full walkthrough)

Open any `/dashboard/admin/...` page. The left menu is grouped: **PEOPLE → OPERATIONS → FINANCE → SYSTEM**.

### 3.1 Command (`/dashboard/admin`) — your home screen

Your control room: greeting, **5 summary cards** (Total Revenue, Total Calls, Leads Generated, Agents Online, Active Campaigns), a **7-day Call Activity chart**, **Live Operations** box (active/queued calls, connect rate), **System Health** box (routing, database, gateway, webhooks, worker), a **Needs Attention** list (Disputes, Failed calls, Dispositions, Publisher issues — each with a **Review** button that jumps you there), **Top Campaigns**, **Agent Performance**, **Recent Calls** tables (each with **View all**), and **Quick Actions**: Create Agency, Invite Agent, New Campaign, Invite Publisher.

*How to test:* open it, click every **View all / Review / →** link and confirm each lands on the right page.

### 3.2 Agencies (`/dashboard/admin/agencies`)

Lists every client company: Name, Code, Slug, Status, Currency, Recording Retention, Created date.

- **+ New Agency** → form (see below).
- **Status filter** (All / Active / Pending / Suspended / Closed) + **search box** (+ × Clear) narrow the list.
- **Click a row** → agency detail. **Delete** per row hides it (after confirmation). Pages at the bottom.

**New agency** (`.../agencies/new`): type **Agency Name** (the web slug auto-fills, editable, must be unique), optionally add teammate emails in **Invite teammates** (one per line — invites go out on creation), check the live **Summary**, click **Create agency** (disabled until both fields are filled), or **Cancel**. The same invite box exists when agents create their own agency from Settings.

**Agency detail** (`.../agencies/[id]`): rename, edit slug, set **Status**, **Currency** (e.g. USD), **Recording Retention** (days, 1–3650), **Postpaid checkbox** (lets members take calls without prepay — admin-only for a reason), **Save changes**. **Invite agents** box: type an email → **Invite**. **Delete** removes the agency (after confirmation). A bad link shows "Agency not found" + back button.

*How to test:* create an agency → find it in the list → open, edit, save → invite an agent by email → check the invite arrives.

### 3.3 Agents (`/dashboard/agents`)

Everyone who can answer calls, all agencies in one list.

- **Search** by name/email. **+ Invite** goes to the email-invite form.
- **Status tabs:** All / Pending / Approved / Rejected / Suspended. The **Pending** tab shows a count badge when people wait for approval.
- **Click an agent's name** → their detail page. Tick **checkboxes** to select several (a bar shows the count + **Clear**).
- Per row: **Approve** (if not approved), **Decline** (if not rejected), **Suspend** (if approved).
- **Typical flow:** new signup appears under **Pending** → click name to review → **Approve** → approved agents with no team automatically join your **Platform home agency** (see System Settings), so they can fund, subscribe and go online with zero extra steps.

**Agent detail** (`.../agents/[id]`): profile (name, email, priority, last assigned), **NPN** license-ID field + Save, **Software Access** monthly fee + Save, **Approval** box (Approve / Reject / Suspend buttons match current status), availability badge, **Skills** (Edit → pick/unpick → Save/Cancel), **Call method** (Edit → Browser and/or Phone-forward cards, forwarding number when phone is chosen → Save), **Licensed States** (Edit → state buttons → Save/Cancel/**Clear all** = eligible everywhere). **Back** returns to the list. A removed agent shows a friendly "Agent not found" page instead of an error.

**Invite by email** (`.../agents/new`): email field, work-type badges (+ **New vertical** popup), summary panel, **Send invite** / Cancel.

**Manual create** (`.../admin/agents/new`): pick **Agency** + **User** from dropdowns (membership auto-created if needed), set **routing priority** (lower number = calls first), **Licenses** (P&C, Health, Life, Auto), **Skills**, **State Coverage** (empty = everywhere), check **Summary**, **Create Agent** (lands on the new profile) or Cancel.

*How to test:* register a fresh agent → confirm they land in **Pending** → open → Approve → confirm status flips, they join the platform home agency (Users page), and they can go online.

### 3.4 Users (`/dashboard/admin/users`)

Every login account, every role, in one place. Two tables:

- **Search** (name/email/role) + **Role filter** (All/admin/agent/publisher) + **Status filter** filter both tables; **Clear filters** appears when active.
- **All users table:** name/email/ID, platform-role badge, list of agencies (agency · role · status) or "No agency".
  - **Create profile** (only on agent-role users missing an agent profile, e.g. someone who signed up but never opened the app) — creates the profile so they appear under Agents and can be approved.
  - **Delete** — *permanently* removes the user, their memberships and agent profiles from the database (confirmation first; blocked for your own account, the last admin, or users with call/financial history — suspend those instead).
- **Memberships table:** User, Agency, Role (**dropdown to change instantly** — picking admin asks "are you sure?"), Status, **Suspend/Activate**. Clickable headers sort; pages at the bottom.

*How to test:* change someone's role → suspend → re-activate → try **Create profile** on a "No agency" agent → confirm they appear under Agents.

### 3.5 Leads (`/dashboard/leads` + `/dashboard/leads/[id]`)

Potential customers. List: **search**, filters (**Status, Source, Agent** — including an **Unassigned pool** option, Start/End date, **Clear** to reset), **CSV/Excel** download of the filtered list, table (clickable email opens the lead; phone, source, status, last call, talk time, result, sale amount; sortable; pages), per-row **agent reassign dropdown**, **Claim button on unassigned rows** — take the lead for yourself (first click wins), per-row **× Delete** (confirms first).

Lead detail: **Delete**, **Back**, details (masked contact, source badge, **Status dropdown** that saves instantly, agent, dates), **Call History** (each row links to the call), **Tags** (× removes, box + **+** adds), **Notes** (list + add box), **Timeline** of events.

### 3.6 Campaigns (`/dashboard/campaigns`, `/new`, `/[id]`)

Sales offers agents take calls for. List: **search**, **+ Create**, **Status filter** (All/Draft/Active/Paused/Archived + counts), table (click name for detail; status, routing style, price, external-link status, min talk time, date; sortable; pages).

**New campaign (2 steps):** Step 1 — name (required), routing (**Priority** = lowest number first / **Round robin** = even rotation), **Record calls** checkbox → **Continue**. Step 2 — **price per qualified call**, **minimum connected seconds**, **buffer seconds**, **publishers checklist** (who may send traffic). A side **Summary** + bottom bar tracks progress; **Create campaign** activates when price + agency are set.

**Campaign detail tabs:** **General** (rename via pencil, Retreaver badge, **Deploy to Retreaver**, routing, price, IDs, min-connect, buffer, record toggle, status, endpoints, **Archive** in the Danger Zone), **Publishers** (tick boxes + Save), **Bidding** (max payout cap, open/exclusive visibility, manual bid override with Apply/Clear, agency/agent allow-lists for exclusive), **RTB & Numbers** (auto-bidding toggle, postback key management, Retreaver numbers load/refresh, tracking numbers + Unassign, admin-only Add number), **Assignments** (agency pills, agent pills, required-skill pills, Save).

*How to test:* create a campaign → set price → assign a publisher + agents → set Active → confirm agents see it under Campaigns.

### 3.7 Publishers (`/dashboard/admin/publishers`)

Traffic partners. Top: connection badge, last-sync time, **+ Invite publisher** (scrolls to form), **Check status**, **Sync calls**, **Sync campaigns**. Invite form: **Name** (required), Email, Retreaver afid (blank = auto on provision), **Fixed price/call** → **Add**. Filters: search + status + counts. Table rows have a **⋮ menu**: **Invite** (emails portal link + backup copy; shows "Portal linked" when done), **Provision/Retry** (first-time Retreaver setup), **Pause/Resume**, **Disable/Enable**, **Delete** (unlinks campaigns). A **Retreaver Performance** table shows calls/connected/payout/revenue/margin + totals.

*Duplicate protection:* two publishers can never share an email (second save is refused with "already exists").

### 3.8 Calls (`/dashboard/calls` + `/dashboard/calls/[id]`)

Every call. List: **search**, **status filter** (Received → Ended, Failed, Missed, Disputed…), **CSV/Excel** export, **Simulate Call** (creates a test call), table with clickable IDs, sorting, pages.

Call detail: overview facts, **recording player** (+ Download / Delete), **result section** (badge if judged; Result dropdown + sale amount + notes + **Submit Disposition** if unjudged; **+ Add note** / **Mark disputed** while live), notes list, routing/qualification blocks, event timeline, **Back**.

### 3.9 Disputes (`/dashboard/admin/disputes`)

Calls flagged for review. **Pending/All** toggle, **search**, counts, table (click ID for detail), per-row **Confirm (payout)** (approves + invoices) or **Reject** (no payout) — each confirms first and clears the row.

### 3.10 Recordings (`/dashboard/recordings`)

All call audio. **Search**, **Sync from Retreaver**, per-row **Download** + **Delete** (confirms), counts, pages, and a setup checklist when empty.

### 3.11 Scripts (`/dashboard/scripts`, `/new`, `/[id]`)

What-to-say guides. Library: **search**, **+ New Script**, **category filter** (+Clear), click title to read. New: title, category, assigned campaign (or all calls), tags, big content box, **placeholder buttons** (e.g. + [Your Name] inserts at cursor), **live preview**, **Create Script** / Cancel. Detail: full text, read-only.

### 3.12 Tutorials (`/dashboard/tutorials`, `/new`, `/[id]`)

Training videos. Library: **+ New Tutorial** (managers only), **category tabs**, cards with thumbnail/required/completed badges + **Watch** (popup player; **Mark complete** for YouTube, auto for direct video) + **Details**. New: title, category, tags, video URL, duration, thumbnail, order, **Published** + **Required** checkboxes, content, **Create Tutorial** / Cancel. Detail: player + text; admins get **Edit** (same fields + Save/Cancel).

### 3.13 Skills (`/dashboard/admin/skills`)

Tags that match agents to campaigns. **Add Skill** form (name required + sort number), **search**, **status filter**, table (sortable) with **Enable/Disable** (hides from new picks, keeps old tags) and **Delete** (agents keep existing tags) per row.

### 3.14 Plans (`/dashboard/admin/plans`)

Subscription tiers agents buy. **New Plan** popup (name, monthly price — $0 = free, call allowance — 0 = unlimited, **Prepaid/Postpaid** billing, feature bullets for the homepage) → Create/Update/Cancel. Table rows: **Edit**, **Deactivate/Activate**, **Archive** (confirms).

### 3.15 Fees (`/dashboard/admin/fees`)

Extra charges. **Generate Monthly Fees** + **Generate Weekly Invoices** (both confirm first), explainer text, **type filter** (Dialer/Software Access), **search**, counts. Pending table: agent, type, amount, due date (+Overdue tag), invoice link; per-row **Charge** or **Waive** (both confirm).

### 3.16 Revenue (`/dashboard/admin/revenue`)

Money over time from paid invoices. **Range** (7/30/90 days), 4 cards (Total, Invoice Count, Avg/Day, Period), trend chart, daily breakdown table.

### 3.17 Payments (`/dashboard/admin/payments`)

Every Stripe top-up + rescue tools. Cards: **Collected (net credit) · Live** (real `cs_live_...` charges only — test money never counts), **Processing fees · Live**, **Pending** count. **Recover a missing payment**: paste a `cs_...` session ID → **Verify + Credit** (checks with Stripe, credits if paid). **Payment history** with **Live/Test/All tabs** (Live default); per row: date, credit/fee, agent/agency, status, LIVE/TEST badge, Stripe short ID, **Open ↗** (Stripe Dashboard), **Verify** on pending rows.

*How to test:* top up a wallet with a test card → switch to **Test** tab → confirm the **Collected** card does NOT move.

### 3.18 Ledger (`/dashboard/wallet`)

Shared money ledger. **Search**, **+ Top Up** (presets $25–$500, custom field, live fee-math preview, **Checkout** to Stripe, Cancel), **Transaction History** (Balance In/Out/Net cards, **All/In/Out tabs**, type dropdown, table, pages), **Agent Funding** (search agents → per-agent **Transfer →** popup: amount + optional reason → **Send** moves agency money to the agent instantly, no card charge).

### 3.19 Reports (`/dashboard/reports`)

Performance charts. **Range** (7/30/90 days), **CSV/Excel** export, 4 cards (Calls, Revenue, Campaigns, Agents Online), volume/revenue/conversion/duration charts.

### 3.20 Support tickets (`/dashboard/admin/support`)

Answer user tickets. **Status filter**, **search**, table (click subject → right-side detail), per-row **Start** (Open→In progress), **Resolve**, **Close** (disabled when not applicable). Detail: badges, reply history, **reply box** (Ctrl+Enter sends) + **Send**, **✕** to hide.

### 3.21 CMS (`/dashboard/admin/cms`)

Edit website content live, no code. **Tabs:** Sections (homepage), Campaign Ads, Blog. **Quick-add cards** (FAQ/Testimonials/Privacy/Terms — click to create or edit). Sections table (click to edit, **Active/Hidden** toggle). **+ New custom section** (slug + title). Editor: title; FAQ items (question/category/answer, + Add, Remove); testimonials (name/role/quote); legal pages (text box + Preview/Edit toggle); custom (JSON). **Save & Publish** goes live instantly.

### 3.22 Notifications (`/dashboard/notifications`)

Bell alerts. **Search**, unread+total counts, **Mark all read**, per-row **Mark read**, pages, live refresh.

### 3.23 Settings (`/dashboard/settings`)

Yours + your agency's setup. **Tabs:** Agency (always), Members + Phone Numbers (heads only). With an agency: team badge + name. Without: **create-agency form** (name + short name + Create), or **Leave & Create** (must tick "I understand"), or waiting-approval / disabled notices. Agents also get **Quick Links** (Wallet/Subscriptions/Support), a **Licensed States** picker, and creation-status info. Admins instead see a platform view (creation on/off switch, links to Users/Agencies/System Settings).

**Members tab** (heads): search, role filter, per-row role dropdown + **Suspend/Activate**.

**Phone Numbers tab** (heads): search, **+ Add number** popup (number, offer, provider Telnyx/Twilio), per-row offer mover; non-heads see a "Heads only" notice.

**The number rule (read once): one number lives on one campaign at a time.** The number is that campaign's inbound door and its caller ID. The list always shows each number's current campaign — to reuse a number, **move** it with the per-row dropdown (or park it as spare); adding an already-assigned number tells you exactly which campaign holds it (spare-pool numbers are claimed in place automatically).

### 3.24 System Settings (`/dashboard/admin/settings`)

Platform switches. **Stripe card:** Test/Live **mode tabs** (Live warns REAL charges), key fields with eye toggles, **Test Connection**, **Save & Use Test/Live**, webhook URL help. **Agent agency creation** on/off toggle + Save. Read-only Security & Data + Platform Health cards with shortcut links.

### 3.25 Feature Requests (`/dashboard/feature-requests`)

Ideas board. Agents/publishers: title + description + **Submit**. **Open/All tabs**, per-idea **vote button**, admins set status (Open → Completed/Declined) via dropdown.

### 3.26 Membership (`/dashboard/membership`)

Team management by user ID. Search + count, table (click ID for a read-only detail showing permissions), role dropdown, Suspend/Activate, and an **Invite box** (paste User ID from Admin → Users, pick role, **Send invite**).

### 3.27 Calendar (`/dashboard/admin/calendar`)

Retired — instantly redirects to the admin home. (Booking lives in GoHighLevel.)

---

## 4. Agent Console (full walkthrough)

The agent sidebar: **Command, Take Calls, Campaigns, Book Call, Campaign Updates, Calls, My Wallet, Subscriptions, Scripts, Tutorials, Support, Notifications, Settings, Feature Requests** (+ **Pool Wallet** for heads).

### 4.1 Command (`/dashboard`) — agent home

Status badge (Available/Offline + shortcut), **Take Call** + History box, performance tiles (today's calls, earnings, connect rate, avg length), **My Wallet** / Reports links, quick buttons (Take Calls, Book a Call, Scripts, Reports), earnings + results charts, recent calls (+View all), daily goal bars, next-action box. (Admins see the boss variant with **Open Admin Console**, Dispositions, Manage Agents, View Agencies, Recruit Agents.)

### 4.2 Take Calls (`/dashboard/take-calls`) — the money screen

1. Status area (approval, call method, totals, browser-phone health).
2. Big **Go Online / Go Offline** — locked until ALL checks pass, telling you exactly why (approval, payment, campaigns, headset…).
3. **Create Agent Profile** appears if you have no profile yet.
4. **Live Campaigns**: search offers, flip **Go live/Live** per offer.
5. **Device check**: test mic + speaker (required).
6. Snapshot (approval, method, forwarding number, priority, states, last call) + readiness checklist (6 pass/fail rows).
7. **Licensed States**: Edit → pick state codes → Save (Clear = all states).
8. **Recent Calls** table (search + Clear, clickable IDs, pages).

*Test: new agent → approve as admin → top up wallet → pick a campaign → pass headset → Go Online.*

### 4.3 Campaigns (`/dashboard/agent-campaigns`)

Browse offers: search, method filter, status filter (Assigned/Open/Not assigned), sortable table (price, routing, min length, methods, assignments, your status), **Join Campaign / Request Assignment**, **Interested** (copies offer ID for your boss).

### 4.4 Book Call (`/dashboard/onboarding`)

Book training: embedded live calendar, **I've booked my call** (marks it; banner confirms), **Book again** to redo, link to Campaign Updates.

### 4.5 Campaign Updates (`/dashboard/campaign-updates`)

News feed (photos/videos play inline) + Book Call link.

### 4.6 Calls + detail

Same history list as admin (search, status filter, CSV/Excel export, Simulate Call, clickable IDs, sorting, pages) and the same detail page (recording player, result judging, notes, dispute flag, timeline).

### 4.7 My Wallet (`/dashboard/wallet/agent`)

Balance tab: big balance, week's earnings, pool-bonus note, 14-day earnings chart, **Top Up** ($1/$250/$500/$1000 → **Pay $X** to card checkout with fee math), transaction history (search, pages). **Subscriptions** tab links to plans.

### 4.8 Subscriptions (`/dashboard/agents/subscription`)

Your monthly plan: current-plan card (name, price, included/used calls bar, dates, renewal), plan cards with **Subscribe — Free / $X** (paid goes to checkout; current one is disabled), payment-status messages.

### 4.9 Pool Wallet (`/dashboard/wallet/pool`) — heads only

The team pot (others see a "heads only" notice). Balance / given-out / remaining, **Enable/Disable pool**, top-up field + **Top up via card** (fee math shown), per-agent rows (personal + effective balance, dollar field + **Save** sets their share — total shares can't exceed the pot).

### 4.10 Scripts / Tutorials / Support / Notifications / Feature Requests / Affiliate

Same as admin §3.11–3.12/3.20/3.22/3.25 (agents can't add tutorials; suggest-form only on ideas). **Affiliate** (`/dashboard/affiliate`): **Create Affiliate Code** (code field + Create/Cancel) → code, commission %, earnings, start date, share link, How-It-Works steps.

### 4.11 Settings / Members / Phone Numbers

See §3.23 (agents get the agency-creation flow, Quick Links, states picker; heads get the Members + Phone Numbers tabs).

### 4.12 Team pages (heads)

- **Agents list/detail/new/recruit/earnings/top-performers** — §3.3 (approve/suspend, invite, sub-agency creation with commission %, invite table, earnings + date ranges, leaderboard + ranges).
- **Membership** (§3.26), **Invoices** (§3.18 list + detail: Back, ID, status, amount, call, date), **Campaigns/Leads/Recordings/Reports** (§3.6/3.5/3.10/3.19).

---

## 5. Publisher Portal (full walkthrough)

Sidebar: **Overview, Campaigns, Calls, Payouts, Scripts, Tutorials, Settings**.

### 5.1 Overview (`/dashboard/publisher`)

Status badge, 5 boxes (Earned, Total Calls, Qualified Rate, Avg Payout, Campaigns), 7-day earnings chart, **quality funnel** (Total → Connected → Qualified → Earned with % losses), **Today** box, **Payout Overview** (+ **View Payouts**), **Campaign Performance** table (search, View all), **Top Campaign** card (+ View), **What to do next** (browse, copy tracking link, payout history, settings), **Recent Qualified Calls** (View all; **Browse Campaigns** when empty), **Your Tracking Links** table (**Copy** per row; paste these in ads/landing pages/emails). **Refresh** reloads everything.

### 5.2 Campaigns (`.../publisher/campaigns`)

Assigned offers + payout chart, search, sortable table (price, calls, qualified, payout), pages, empty-state guidance (contact your manager).

### 5.3 Calls (`.../publisher/calls`)

Every call via your links: payout trend chart, search, sortable table (date, caller, campaign, status, recording **▶ Play**, payout), pages.

### 5.4 Payouts (`.../publisher/payouts`)

Earnings: **Export CSV**, 4 boxes (Total, Qualified, Last-30-days, 30-day count), monthly trend, **Monthly** vs **Qualified Calls** tabs (each with search, sortable tables, pages; **How it works** explains qualification).

### 5.5 Settings (`.../publisher/settings`)

Read-only profile (name, affiliate ID, fixed price, Retreaver status) + editable **Email** (Save), status badge, **Back to Overview**, **View Payouts**, **Contact Support**, **View Campaigns**, **Copy Affiliate ID**.

### 5.6 Joining as a publisher (test flow)

Admin creates publisher (email) → **⋮ → Provision** (creates their Retreaver ID/afid) → **⋮ → Invite** (emails link + backup copy) → register/verify via link → account switches to publisher → portal links automatically (email match) → copy a tracking link → test call through it → watch Overview/Calls/Payouts update after qualification.

### 5.7 The Retreaver button (for publishers with their own tracking)

Publishers who run their own ads/tracker don't need our tracking link — they need the **Retreaver connection**. Each campaign row has a **Retreaver** button opening a popup with:

- **Retreaver tracking number** — the Retreaver phone number carrying *their* affiliate ID on that campaign (+ Copy). **Important: this only appears after YOU assign a number to their affiliate ID inside Retreaver** (Retreaver dashboard → campaign numbers → assign). Until then the popup says exactly that (including how many numbers it checked).
- **Ping-post block** — endpoint (`https://rtb.retreaver.com/rtbs.json`), their publisher ID, campaign key (masked, Show/Hide + Copy). Their tracker sends one web request per call with these three values + the caller's number; Retreaver replies with where to connect the call and books it under their ID automatically.
- If the publisher was never provisioned, or the campaign isn't deployed/active, the popup says so plainly instead of showing values that wouldn't work.

**Your checklist before a publisher can use it:** Provision them (afid appears in the publishers table) → Deploy the campaign → assign one of the campaign's Retreaver numbers to their afid → save the campaign's RTB key (campaign → RTB & Numbers tab). Keys stay secret — if one leaks, replace it in the same tab.

---

## 6. End-to-end test scripts

**A. New agent, zero to first call:** register → verify → open dashboard (profile auto-created) → admin approves (Agents → Pending → Approve) → agent tops up wallet + subscribes → joins campaign → passes headset → Go Online → test call → disposition → earnings appear.

**B. Agency funding its team:** head opens Pool Wallet → tops up by card → allocates per agent → agents see higher *effective* balance → disable pool → allocations stop counting.

**C. Publisher onboarding:** §5.6 above.

**D. Money rescue:** pay with test card → Payments → Test tab shows it, Collected unchanged → paste `cs_test_...` into Recover box → Verify + Credit → balance updates.

**E. Dispute:** agent marks call disputed → admin Disputes → Confirm (pays + invoices) or Reject.

**F. Content:** CMS → add FAQ item → Save & Publish → check live site → Hide again.

---

## 7. Money rules in plain English

- **Top-ups** go through Stripe; a 3% processing fee is added and shown before you pay.
- **Collected (net credit)** counts only real live charges — test payments never inflate it.
- **Pool Wallet** (heads): one shared pot split into per-agent shares; an agent's *effective* balance = personal money + their share. Shares can never exceed the pot.
- **Transfers** (agency → agent) are instant and free (no card involved).
- **Subscriptions**: monthly plans with call allowances; free plans exist; paid plans go through checkout.
- **Fees**: Dialer (postpaid plan price) + Software Access (per-agent); generated monthly/weekly, charged or waived per row; weekly invoices go out Mondays.
- **Payouts**: publishers earn per *qualified* call (min talk time + rules); revenue comes from paid invoices.
- **Suspend, don't delete**, anyone with call/financial history (delete is blocked with that guidance).

## 8. Deploy checklist (server — every release, in this order)

1. Pull latest code.
2. **`npm run migrate`** — applies pending database updates. Skipping this breaks new features (and once took down all inbound calls).
3. `npm run build`, then restart (`npm run start` / docker).
4. Open `/api/v1/health` — it must show no `migrations_pending` warning.
5. Place one test call end-to-end.

## 9. Troubleshooting FAQ

| Symptom | What it means / do this |
|---|---|
| New agent stuck in Pending | Admin → Agents → Pending tab → open → Approve. If the user isn't listed at all, Admin → Users → **Create profile** for them first. |
| "Agent not found" opening/approving | Fixed — refresh; if it persists, the profile was deleted: re-create via Users → Create profile. |
| Go Online locked | Read the stated reason: need approval / top-up / subscription / pick a live campaign / pass mic+speaker test. |
| Paid but balance didn't move | Admin → Payments → paste the `cs_...` ID into Recover → Verify + Credit. |
| Can't see a menu page | Your role doesn't include it (e.g. pool = heads only, tutorials +New = managers only). |
| Deleted a user directly in the database but their agent row (e.g. AG-0004) still lists | Normal — always delete via Admin → Users → **Delete** (cleans everything). To remove the leftover now: Agents list → **Delete** on that row. After the 0067 update, direct deletes clean up automatically too. |
| Test top-up missing from Collected | Correct — test money never counts; check the Test tab. |
| Invite link warns about role change | Normal — one account, role switches to the new company. |
| Calendar page just redirects | Normal — booking lives in GoHighLevel. |

## 10. Glossary

- **Agency** — a client company/team. **Head** — its manager (an agent with team powers).
- **Campaign / Offer** — a buyer's deal agents take calls for. **Routing** — Priority (ranked) vs Round robin (even split).
- **Disposition** — the judged result of a call (sale/no-sale…). **Qualified call** — one meeting the payout rules.
- **NPN** — agent's insurance license number. **Pool** — shared team wallet. **Ledger** — full money history.
- **Publisher / afid** — traffic partner / their tracking ID. **Retreaver** — the external phone system.
- **Live vs Test** — real charges (`cs_live_...`) vs Stripe test-mode (`cs_test_...`).
- **Pending / Approved / Suspended** — agent lifecycle; **Draft / Active / Paused / Archived** — campaign lifecycle.

*Happy testing! Work top-to-bottom: accounts (§2) → your dashboard (§3/§4/§5) → test scripts (§6).*
