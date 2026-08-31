# AI Agent — Call Feedback + Practice Calls (For Client)

> What this feature is, how it will work in our platform, and what it will cost. Nothing is built yet — this is the plan for your review.

---

## 1. What you asked for

An AI agent that helps your agents get better:

1. **After every call** — the AI listens and tells the agent:
   - what they **did well**,
   - what they **could improve**,
   - what they **should have said** instead.
2. **Practice calls** — the agent can call an AI that plays a **pretend customer** (same type of caller, same objections). After the practice call, the AI gives a score and feedback.

Think of it as a **personal sales coach for every agent, available 24/7**.

## 2. How the after-call review works

```
Call ends
   ↓
AI converts the recording to text
   ↓
AI reads the conversation + call details (campaign, outcome, payout)
   ↓
AI writes a short review:
   • What went well
   • What to improve
   • Better way to say it (with the exact moment quoted)
   • Score out of 10
   ↓
Review appears in the app a few minutes later
```

- Happens **automatically** — agents don't do anything.
- Reviews are **saved** so agents can look back and you can track improvement.
- You can see trends, e.g. "agents are struggling with price objections" — and fix it with practice.

## 3. How the practice calls work

```
Agent clicks "Practice call"
   ↓
Picks a scenario (e.g. "Medicare caller worried about price")
   ↓
The AI calls the agent — real voice, plays the customer
   ↓
They talk like a real call. The AI:
   • stays in character
   • raises objections, pushes back, asks questions
   ↓
Call ends
   ↓
AI gives feedback: score, what went well, what to improve
```

- Agents can practice **anytime, as many times as they want** — no manager needed.
- Bonus: after a real call, the agent can click **"Practice this call"** and the AI will replay that exact situation (e.g. "you stumbled when the customer said *let me think about it* — try again").

## 4. What the agent will see

**After a real call** — a new "AI Coach" section on the call page:

- Score (e.g. 8/10)
- What went well / what to improve
- Suggested phrasing ("At 2:10 you said X — try saying Y")
- Button: **Practice this call**

**New "My Practice" page:**

- Choose a scenario
- Start the practice call
- See score + feedback after

**Admin view:**

- Every agent's scores and practice history
- Trends (who needs help, with what)

## 5. What it costs (rough estimates)

| Item | Rough cost |
|---|---|
| Review of one call | $0.10–0.20 |
| One 5-minute practice call | $5–15 |
| Typical daily cost (reviewing all calls) | a few dollars per day |

The **practice calls** are the biggest cost, so those are optional — agents only use them when they want.

## 6. AI services we plan to use (your options)

The feature uses three types of AI services. For each, we've listed the top options — **you can pick one per category, or let us choose the best fit.** We'll confirm current pricing and details with the provider before we build.

**1) Speech-to-text** (turns the recording into text)

| Option | One-line why |
|---|---|
| **Deepgram** | Built for phone audio, fast, cheap per minute |
| **Azure Speech (Microsoft)** | Big-name cloud, strong privacy terms |
| **OpenAI Whisper** | Simple and very accurate on English calls |

**2) The review engine** (reads the text, writes the feedback)

| Option | One-line why |
|---|---|
| **OpenAI (GPT)** | The most popular, best "instruction following" for reviews |
| **Google Gemini** | Very cheap and fast for this type of task |
| **Anthropic Claude** | Excellent at careful, natural-sounding feedback |

**3) The practice-call voice agent** (plays the pretend customer with a real voice)

| Option | One-line why |
|---|---|
| **Retell AI** | Purpose-built voice agents, easy call-in/call-out, good transcripts |
| **ElevenLabs Agents** | Best-sounding voices, realistic interruptions |
| **Vapi** | Flexible, developer-friendly, works with any phone |
| **Azure Voice Live (Microsoft)** | Full-control platform, strict privacy options |

**How it works together:** after a real call → Speech-to-text turns the recording into text → the Review engine writes the feedback → Practice calls use the Voice agent. The app stays exactly as it is today; these services run behind the scenes.

## 7. Security

- Recordings and transcripts contain **personal information** — we will use AI providers with strict data agreements ("data not used for training").
- Only the **agent on the call, their manager, and you** can see a call's review.
- No secrets in the browser or logs — same as our current setup.

## 8. What we need from you

**Your decisions:**

1. **Which calls get reviewed?** All calls, or only connected calls over a minimum length?
2. **Practice calls** — ring the agent's **phone**, or work in the **browser** (no phone number needed)?
3. **Who sees reviews?** Agent + admin only, or should agency owners also see their team's?
4. **Language** — English only, or also Spanish (for your Spanish Final Expense calls)?
5. **Rollout** — switch it on for everyone at once, or start with a small pilot group first?

**From your side (once we start building):**

1. **Provider pick** — your choice from Section 6 (or our recommendation)
2. **Accounts & API keys** — we'll create/request the accounts for the chosen AI services (you'll get the logins and billing access)
3. **Budget approval** — green light on the monthly AI spend (estimated in Section 5)
4. **Recording consent** — confirmation that your recorded calls can be processed by these AI services (needed for the reviews to work)
5. **A test agent** — one agent (or you) to try the feature with before we roll it out wider

## 9. Build order

1. **First:** after-call reviews (the core value).
2. **Second:** practice scenarios + agent practice page.
3. **Third:** "practice this call" from real calls + admin trends.

We'll confirm exact pricing with the AI providers before we start. Everything else in your platform stays exactly as it is — this adds on top.
