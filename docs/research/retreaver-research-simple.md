# Retreaver — What We Learned From Their Docs (Simple English)

> Written for the client. No code was built — this is just research on what Retreaver is and what their system can do.

---

## 1. What is Retreaver?

Retreaver is a **call marketplace**. Think of it like a stock exchange, but for phone calls.

Three types of people use it:

1. **Publishers** — people who bring in calls (ads, websites, marketing campaigns).
2. **Buyers** — people who want to receive calls and pay for them (like our agents/agencies).
3. **The Company** — the middleman who owns the phone numbers, routes calls, and takes a cut (this is us / our admin).

**The flow:**

- A publisher runs an ad → someone calls the number → Retreaver picks which buyer gets the call → the buyer talks to the caller and pays for the lead → the publisher earns a share.

## 2. What can their system do?

Their API (the computer-to-computer interface) can do the following things automatically:


|---|---|
| **Assign calls to publishers** | Tell the system which publisher brought each call, so credit and money go to the right person. |
| **Route calls to buyers** | Automatically pick which agent/agency gets each incoming call, based on rules we set. |
| **Real-Time Bidding (RTB)** | When a call comes in, the system asks buyers "who wants this call, and how much will you pay?" The best offer wins, and we get a guaranteed payout before connecting the call. This is the "bidding publishers" feature. |
| **Set caps & limits** | Limit how many calls a buyer gets per hour/day/month, or pause a buyer anytime. |
| **Business hours** | Only send calls to a buyer during their working hours. |
| **Track sales & payouts** | Mark a call as "sold" after a certain time on the line (e.g. $50 if the call lasts 90+ seconds), so revenue and payouts are automatic. |
| **Call data writing** | Publishers can attach extra info to a call (age, location, campaign name, etc.) before or during the call — useful for lead quality. |
| **Reports & analytics** | How many calls each publisher/buyer got, conversion rates, revenue, payouts, profit. |
| **Call logs** | Full record of every call: who called, duration, who took it, recording link, cost, revenue. |

## 3. How would this fit into our platform?

Our system (Coverage Calls) and Retreaver would connect like this:

- **Our agencies/agents** = the **buyers** in Retreaver (they receive the calls and get paid).
- **Our future "publishers"** = the **publishers** in Retreaver (they bring in the calls).
- **Our campaigns** = the **routing rules** in Retreaver (which number, which buyer, what limits).

So in the future, when you add a publisher to a campaign, our system would tell Retreaver: "this publisher brought this call — here's the buyer — here's what the buyer pays — here's what the publisher earns." Retreaver handles the connecting, tracking, and reporting; we handle our agents, agencies, wallets, and scripts on top.

## 4. What we decided
1. **Do we rent phone numbers from Retreaver, or just use their routing?** — ❓ *Still confirming with client. Our plan supports both options, so no work is blocked.*
2. **Fixed price per call, or per sale?** — **Fixed price per call.** Each publisher gets their own fixed price, set in an RTB (bidding) so calls are paid at that fixed rate.
3. **Do publishers get their own login?** — **No, not for now.** We manage publishers manually from the admin side. A self-service portal is possible later.
4. **One Retreaver account or one per agency?** — **One account for the whole platform.** We connect with the account's API key; each campaign gets its own posting key for bidding.

Full build plan lives in `docs/build-plan.md` — Retreaver phases 2 (ingestion & publishers) and 3 (bidding) are scheduled there.


