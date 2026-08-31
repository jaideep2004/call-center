# Ringelo — Research Notes

**Date:** 2026-07-28
**Sources:**
- https://ringelo.com (marketing site)
- https://os.ringelo.com (agent portal)
- https://os.ringelo.com/signup
- https://www.linkedin.com/company/ringelo

---

## Company Overview

| Field | Value |
|-------|-------|
| Entity | **REOM LLC** (owns Ringelo brand) |
| Industry | Life Insurance Agency / Marketing Services |
| Founded | 2024 |
| Employees | 2 (LinkedIn) |
| Location | Cheyenne, Wyoming |
| Type | Privately Held |
| NAICS | Advertising Agencies, Media Buying, Direct Mail |
| Website | https://ringelo.com |
| Agent Portal | https://os.ringelo.com |
| Contact | Email, Telegram (`@ringeloadmin`) |
| Status | **Active** — © 2026 on site |

Ringelo is **not** an insurance carrier. It connects licensed agents with verified inbound inquiries. They sell one thing: **inbound phone calls** — real, live prospects who dialed in from compliant ad placements, qualified by a screener, bridged to the agent's floor in real time. No aged data, no web leads, no shared records.

---

## The Product

> *"The phone rings. You close. We handle the rest."*
> *"Real-time Final Expense calls bridged to your browser."*
> *"Not shared leads. Not aged data. A real person, on the line, right now."*

**Single vertical:** Final Expense insurance. No Medicare, no auto.

### Call Flow

1. **Source** — A prospect calls a tracked number from a compliant ad (TV-sourced). Intent is self-initiated, never pushed.
2. **Bridge** — Ringelo routes the call live through their own platform to the agent. No callback, no queue.
3. **Connect** — The agent's phone rings. Exclusive caller, on the line, while intent is still hot.

### Key Differentiators

- **Exclusive** — One agent, one call. Never shared, resold, or recycled.
- **Compliant** — Audit-grade consent, TCPA-compliant, DNC scrubs on every call.
- **Real-time** — Bridged live while intent is still hot.
- **TV-sourced** — Premium TV where buyer intent runs highest.

---

## Pricing — "Billable Buffer"

Agents prepay per call based on a **time buffer** (how long the call must last before it bills):

| Tier | Price | Description |
|------|-------|-------------|
| Quick-qualify | **$55/10s** | Fastest hand-off — bills after 10 seconds on the line |
| Standard (Most popular) | **$70/30s** | Balanced qualification and volume |
| Deepest intent | **$85/60s** | Longest qualification window — highest-intent calls |

### Reported Metrics

- **1 in 2** billable calls become a policy
- **<$200** cost per acquisition
- **2 of 5** top IMOs buy from them at scale

---

## Carrier Partners

Mutual of Omaha, AIG, Foresters, Gerber Life, Aetna, Transamerica, Cigna, Prudential.

---

## White-Label Offering

Ringelo offers a complete white-label solution for agencies:

- Complete white-label branding
- Branded agent & agency portals
- Full color, logo & UI customization
- Custom domain
- Flexible options built around the agency

Your logo, your colors, your domain — agents only see your brand. Ringelo powers the calls in the background.

---

## Referral Program

| Tier | Rate | Requirements |
|------|------|--------------|
| Standard | **$2.00**/call | Everyone starts here |
| VIP | **$2.50**/call + $0.50 on sub-referrals | Automatic at 100 referred calls |
| VVIP | **$3.00**/call + $0.50 on sub-referrals | By invitation |

- Weekly payouts by bank transfer
- $100 minimum payout
- No cap

---

## Agent Portal (`os.ringelo.com`)

- **Next.js** app (inferred from `/_next/image`, `_next/static` paths)
- **Auth:** Email/password login with "stay signed in for 14 days" option
- **Signup:** Starts with first/last name, progressive onboarding
- **UI:** Card-based, custom CSS, dark neutral palette with accent colors
- **Telephony:** Browser-based calls via **WebRTC** softphone
- **Credit system:** Agents add credits, go online, take live calls — credits deducted per connected call
- Tagline on login page: *"Real-time Final Expense calls bridged to your browser. Approved insurance agents add credits, go online, and take live calls."*

---

## Technology Stack (Inferred)

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (React) |
| Agent portal | `os.ringelo.com` (Next.js app) |
| Marketing site | `ringelo.com` (Next.js app, separate) |
| Browser telephony | **WebRTC** softphone |
| Telephony provider | Unconfirmed (Twilio/Telnyx/own infra) — *"software we built end to end"* |
| Ad tracking | Facebook Pixel (found on page) |
| CDN/Images | Next.js image optimization |
| Compliance | TCPA-compliant, DNC scrubbing, audit-grade consent |

---

## LinkedIn Activity

- **Nov 2025:** Hiring Designated Responsible Licensed Producer (DRLP) — TX, FL, GA, OH, IL
- **Nov 2025:** Hiring Licensed Life Insurance Agent — DRLP / Compliance Partner (Remote)
- **Oct 2025:** Hiring Business Development Manager (UAE)
- ~126 followers, small team (2 listed employees)

---

## Relevance to This Project

Ringelo is the closest comparable implementation to our call center platform:

| Feature | Ringelo | Our Platform |
|---------|---------|-------------|
| Browser softphone | WebRTC | WebRTC (Telnyx SDK) |
| Inbound call routing | Real-time bridge to agent | Real-time routing + bridge |
| Agent portal | Next.js (os.ringelo.com) | Next.js (our dashboard) |
| Monetization | Prepaid credits per call | (TBD — subscription/commission) |
| Vertical | Final Expense insurance | Multi-vertical |
| Lead source | TV ads + screener | (TBD) |
| White-label | Yes | (TBD) |
| Compliance | TCPA, DNC, audit | (TBD) |

### Architecture Insights from Ringelo

- **Single vertical focus** — They do one thing (Final Expense) and do it well. Suggests starting narrow is a viable strategy.
- **"Bridged live"** — Calls are bridged in real time, no callback, no queue. Same approach we're taking.
- **Billable buffer pricing** — Charging based on call duration threshold is a clean monetization model. Could adopt for our platform.
- **Credit system** — Agents prepay for credits, go online/offline at will. Simple inventory-based model.
- **Own platform** — *"Routed live through our own platform — software we built end to end."* They built custom infrastructure, not off-the-shelf.
- **TV ads as source** — High-intent buyers come from TV infomercials. Different from typical search/social funnel.
- **White-label option** — They offer branded portals for agencies. Suggests agency/IMO channel is their primary growth vector.

### Potential Reference Points

If we need inspiration for:
- **Pricing page** → Ringelo's billable buffer model with 3 tiers
- **Agent portal UX** → Credit balance, online/offline toggle, call history
- **White-label architecture** → Multi-tenant portal with custom branding
- **Referral program** → Multi-tier referral with sub-commissions
- **Compliance flows** → TCPA consent, DNC scrubbing, audit trails

---

## Notes

- Ringelo is operated by **REOM LLC** (Wyoming). Likely a lean, automated operation.
- Contact methods: Email + Telegram bot (`@ringeloadmin`). Telegram suggests direct, low-friction communication with agents.
- Instagram presence: `@officialringelo`
- Found hiring for UAE BDM — possibly expanding internationally or targeting expat insurance markets.
- The phrase *"bridged to your browser"* vs *"bridged to your floor"* distinguishes the WebRTC softphone (individual agents) from traditional phone transfer (call centers).
- Final Expense is their beachhead. The FAQ says *"Final Expense first"* — implying expansion to other verticals later.