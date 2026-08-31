# Call Routing & Billing — Confirmations & Final Questions

Here's the last few details we need from you.

---

## 1) Caller's State — Confirmed ✅

**What we understood from your answer:**
- The system will **automatically find the caller's state from their area code** (first 3 digits of the phone number).
- We will **display the caller's state** to the client (in the interface), so everyone can see where the call is coming from.
- This replaces the old behavior of always assuming the campaign's first state.

## 2) Time-Based Pricing / Bidding — Confirmed ✅

**What we understood from your answer:**
- The time-of-day price is a **bidding tool** — it lets you control what we pay publishers per call at different times of day, so you can **win more calls from publishers** when you want them (and spend less when you don't).
- So this price is set by you (the admin) and applies to the **publisher payout**, changes take effect immediately, no waiting for a release.

## 3) The $50 Fee — Confirmed ✅

**What we understood from your answer:**
- The **$50/month is for accessing the software** itself.
- You asked us to **never call it a "Dialer fee"** — that name makes agents object to the price. We'll refer to it as something like **"Software Access — $50/month"** and present it as the price of using the platform, not a call-related charge.

## 4) Postpaid Billing — Confirmed ✅

**What we understood from your answer:**
- Postpaid agents are billed **every week** (not monthly).
- They take calls normally, we track their usage, and the usage is added to their invoice, which is billed weekly.

## 5) Prepaid Before Postpaid — Confirmed ✅

**What we understood from your answer:**
- When agents are available: **Prepaid agents get the call first**, Postpaid agents only get it if no Prepaid agent is eligible.

## The final routing flow (as confirmed)

```
INCOMING CALL
        │
        ▼
 Determine Caller State (from area code)
        │
        ▼
      Find Licensed Agents
        │
        ▼
    Check Availability
        │
        ▼
    Check Billing Status
        │
  ┌──────┴──────┐
  ▼             ▼
PREPAID       POSTPAID
  │             │
Check Wallet  Track Usage
  │             │
Balance OK?   Add to Weekly
  │             Invoice
  │             │
  └──────┬──────┘
         ▼
      ROUTE CALL
   (Prepaid agents first)
         │
         ▼
  Agent Answers
```

---

## Final questions for you


| 1 | Where should the caller's state be **displayed**? (e.g., on the "Take calls" screen, in a popup when the call arrives, on the call record page?) | We want to build it in the right place 

| 2 | Prepaid per-call price: keep a **flat $1 per call**, or price it **per campaign** (e.g., per minute)? And if an agent's balance is too low for even one call, should they be **skipped** or still get the call? | This is the core billing rule |

| 3 | Do the existing **monthly plans (with call allowances)** stay, or do Prepaid/Postpaid fully **replace** them? |Decides if we keep or remove that part |

| 4 | Time-of-day bidding: is the schedule **hourly, per day of the week**? Which **timezone**? If a call happens at a time with no schedule entry — use the **flat price**, or **don't route**? | Defines exactly how the schedule works 

| 5 | What should the $50 fee officially be called (**"Software Access"**)? Is it charged **automatically by card**, and does it apply to **both** Prepaid and Postpaid agents? | Settles the final pricing label + payment setup 

| 6 | Weekly billing for Postpaid: which **day** of the week? Do we **auto-generate the invoice**, and are overdue postpaid agents ever **blocked from calls**, or always allowed? | Defines the weekly billing job 

| 7 | Area code lookup: use just the **3-digit area code** or a longer prefix? For **toll-free / unknown / international** callers, fall back to the campaign's state? And if the caller's state is **not in the campaign's allowed states** — don't route at all? | Covers edge cases 

That's everything — once we have these 7 answers, we can finalize the logic and start updating.

---

## CLIENT ANSWERS (FINAL — 2026-08-24)

| # | Answer |
|---|--------|
| 1 | Caller state displayed on: **Take Calls screen**, **popup when call arrives**, and **call logs page** |
| 2 | **Per campaign pricing** — adjustable based on Campaign, Publisher, and Bidding. Agent balance below campaign price -> agent **cannot take calls** (skipped in routing). |
| 3 | Plans stay, renamed by payment type. **Postpaid: "Dialer Fee" = $50/month/agent (adjustable per agent)**. **Prepaid: adjustable monthly fee labeled "Software Access"** (never mention "Dialer Fee" to prepaid agents). |
| 4 | **No schedule** for bidding. Admin manually changes bid whenever call volume is low (depends on how many agents are available). |
| 5 | Postpaid fee is officially **"Dialer Fee" ($50, adjustable)**; Prepaid fee is **"Software Access"** (adjustable). |
| 6 | **Monday**: system generates the invoice (visible to admin); **admin sends it to the agency manually**. Admin must be able to **block agents from calls, terminate accounts, or manually pause them**. |
| 7 | Use the **3-digit area code** to determine state. Accept/reject the ping based on **agent's state, availability, and campaign structure**. If caller's state is not in the campaign's allowed states -> **do not route, reject the ping/RTB** and pass the reason to the publisher (`state_mismatch` / `no_agent_available`). **Never hang up the call ourselves — always accept/reject the PING first.** |

### Resulting billing/routing model (final)
- Pricing: per campaign (not flat $1). Three knobs: campaign price, publisher payout, admin bid adjustments (manual, no schedule).
- Routing eligibility gate: agent balance >= campaign price, else skip. Prepaid agents first, postpaid only if no prepaid eligible.
- Fees: prepaid = "Software Access" (monthly, adjustable), postpaid = "Dialer Fee" ($50/mo default, adjustable per agent).
- Invoicing: auto-generate postpaid invoice every Monday; admin reviews and manually sends to agency. Manual controls: block / terminate / pause agent.
- Caller state: 3-digit area code (NPA) -> state. Mismatch with campaign allowed states -> reject ping with reason. Ping-first always; never self-hangup.