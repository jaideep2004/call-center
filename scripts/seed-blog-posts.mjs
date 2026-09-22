// Seed CMS blog posts (idempotent by slug — safe to re-run).
// Usage: node scripts/seed-blog-posts.mjs   (uses .env DATABASE_URL)
import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const POSTS = [
  {
    slug: "scale-to-150k-inbound-zero-voip",
    title: "How Top Insurance Agencies Scaled to $150k/mo Inbound With Zero VoIP Hardware",
    excerpt: "A teardown of how modern agency leaders eliminated desktop VoIP desk-phones, switched to browser-native WebRTC, and reduced average speed-to-answer to under 14 seconds.",
    cover_image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&auto=format&fit=crop&q=80",
    category: "Agency Growth",
    tags: ["Inbound Calls", "WebRTC", "Agency Scaling", "Medicare ACA"],
    author_name: "James Wilson",
    author_role: "Head of Growth",
    author_avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    read_minutes: 7,
    featured: true,
    published: true,
    body_markdown: `For the past decade, high-volume insurance agencies have been trapped in an expensive cycle: purchasing $400 desk SIP handsets, paying recurring monthly licensing fees to legacy PBX providers, and watching valuable inbound callers drop after sitting in 45-second queue trees.

## The Hidden Hardware Tax

When an insurance agency scales from 5 to 50 remote agents, telephony infrastructure is almost always the first bottleneck. Traditional PBX setups require hardware provisioning, VPN tunnels, and complex SIP trunks that degrade audio quality.

More critically, physical phones disconnect the agent from dynamic browser CRM context. When a prospect calls after seeing a Medicare or Final Expense ad, the agent is forced to scramble across three tabs before introducing themselves.

## The WebRTC Advantage

By transitioning to browser-native WebRTC protocols, voice data travels directly over encrypted, ultra-low latency channels. No phone hardware, no softphone desktop apps to crash mid-call.

> The moment we routed calls directly to the agent's browser with pre-populated prospect intent, our average talk time increased by 4 minutes and our bind rates exploded.
>
> — Sarah Jenkins, Principal Broker at Apex Health

## Live Telemetry and Call Intent

What separates a standard call from a $150k/mo inbound engine is **real-time telemetry**. The browser workspace should inform the agent of the caller's intent before they even hit answer:

- **Pre-call intent header:** which campaign (ACA $0 premium vs. Final Expense) the prospect responded to.
- **Real-time audio quality index:** jitter monitoring directly in the viewport.
- **Instant dispositioning:** one-click tagging that updates billing in milliseconds.

## The 4-Step Scaling Playbook

1. **Audit lead vendor routing:** numbers must route directly to dynamic WebRTC endpoints.
2. **Standardize browsers:** noise-canceling headsets plus modern Chromium.
3. **Activate live notes:** auto-transcribe every conversation for compliance.
4. **Set dynamic distribution:** route to the highest-closing agent per vertical.

## Key Takeaways

Inbound telephony is no longer about bulky phone switches — it is an intelligence layer. Agencies that adopt instant browser routing out-close and out-scale traditional competitors every single time.`,
  },
  {
    slug: "15-second-rule-inbound-conversion",
    title: "The 15-Second Rule: Why Inbound Lead Conversion Drops 60% After 3 Rings",
    excerpt: "New telematics data from 1.2M insurance calls proves why instant browser routing beats traditional call queues every time.",
    cover_image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80",
    category: "Conversion Rate",
    tags: ["Data Report", "Speed to Answer"],
    author_name: "Marcus Vance",
    author_role: "Data Analyst",
    author_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    read_minutes: 5,
    featured: false,
    published: true,
    body_markdown: `Speed-to-answer is the single highest-leverage metric in inbound insurance sales. Across 1.2M analyzed calls, conversion holds steady through the first 15 seconds — then falls off a cliff.

## What The Data Shows

Calls answered within 15 seconds convert at nearly triple the rate of calls answered after 45 seconds. Every ring past the third costs roughly 20% of close probability. Traditional queues, with their greetings, IVR trees, and round-robin delays, routinely burn 30 to 60 seconds before a human says hello.

## Why Queues Lose

- **IVR trees** add 10-20 seconds of button-pressing before routing even starts.
- **Round-robin** rings agents who are wrapping up previous calls.
- **Desk phones** ring empty desks during breaks and shift changes.

## The Browser Routing Fix

Direct-to-browser routing collapses the chain: ping, eligibility check, and dial happen in under two seconds. Pair it with auto-pickup and the agent is talking before the caller finishes their first breath.

## Key Takeaways

Measure speed-to-answer per campaign, kill every second of pre-answer latency you can, and watch bind rates follow. The first 15 seconds are worth more than the next 15 minutes of pitch.`,
  },
  {
    slug: "ai-whisper-coaching-medicare-day-one",
    title: "AI Whisper Coaching: Training New Agents to Close Medicare Deals on Day 1",
    excerpt: "How real-time script adherence prompts and sentiment tracking cut new agent ramp-up time from 6 weeks to 4 days.",
    cover_image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
    category: "AI & Automation",
    tags: ["AI Strategy", "Training"],
    author_name: "Chloe Bennett",
    author_role: "Training Lead",
    author_avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    read_minutes: 6,
    featured: false,
    published: true,
    body_markdown: `Medicare compliance makes new-agent ramp-up slow and expensive — six weeks of shadowing before a rookie touches a live caller. Whisper coaching compresses that to days.

## How Whisper Coaching Works

While the prospect hears only the agent, the agent's screen shows live prompts: the next script beat, the disclosure that must be read verbatim, and a sentiment gauge for the caller's tone. Nothing is audible to the caller.

## What It Changes

- **Ramp-up:** 6 weeks of shadowing becomes 4 days of supervised live calls.
- **Compliance:** required disclosures are prompted every time — no more fined-forgotten lines.
- **Consistency:** every agent runs the same proven beats, not their own improvisation.

## Rolling It Out

Start with one campaign and three beats: the hook, the qualification filter, and the compliance disclosure. Review transcripts weekly, tighten the prompts, then expand to every vertical.

## Key Takeaways

Whisper coaching turns training from a calendar problem into a software problem. Your best closer's instincts, encoded as prompts, available to every rookie on day one.`,
  },
  {
    slug: "inbound-script-playbook-final-expense-aca",
    title: "The Complete 2025 Inbound Call Script Playbook for Final Expense & ACA",
    excerpt: "Our top-converting 4-stage call framework: The Hook, Qualification Filter, Intent Confirmation, and One-Click Bind.",
    cover_image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80",
    category: "Call Playbooks",
    tags: ["Playbook", "Scripts"],
    author_name: "Elena Rostova",
    author_role: "Sales Director",
    author_avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    read_minutes: 9,
    featured: false,
    published: true,
    body_markdown: `After scoring 400,000+ inbound transcripts, our highest-converting calls all follow the same four stages. Here is the framework, word for word in structure.

## Stage 1: The Hook (0-15 Seconds)

Confirm why they called before you introduce yourself: *"Thanks for calling about the $0 premium plans — I can check what you qualify for in about two minutes. What's your zip code?"* Intent first, identity second.

## Stage 2: Qualification Filter

Three questions, no more: age band, current coverage, and doctors they want to keep. Anything else is small talk that burns billable seconds.

## Stage 3: Intent Confirmation

Repeat it back: *"So you want lower premiums and to keep Dr. Smith — is that right?"* A "yes" here predicts binds better than any demographic.

## Stage 4: One-Click Bind

Never ask "would you like to enroll." State the next step: *"I'm pulling your options now — it'll take sixty seconds."* Then disposition the call the moment it ends so billing and vendor data stay clean.

## Key Takeaways

Hook, filter, confirm, bind. Print it, laminate it, put it where every agent can see it. The framework is the product.`,
  },
  {
    slug: "call-centers-waste-lead-spend-unbillable",
    title: "Why Traditional Call Centers Waste 32% of Lead Spend on Unbillable Traffic",
    excerpt: "Unmasking IVR latency bottlenecks and how dynamic caller qualification filters only connect high-intent, ready-to-buy prospects.",
    cover_image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80",
    category: "Medicare & ACA",
    tags: ["Optimization", "Lead Quality"],
    author_name: "David Sterling",
    author_role: "Operations Consultant",
    author_avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    read_minutes: 4,
    featured: false,
    published: true,
    body_markdown: `Nearly a third of paid inbound traffic never had a chance: wrong state, wrong age band, accidental pocket dials — all routed, all answered, all billed as effort.

## Where The Waste Hides

- **IVR latency:** every menu layer sheds high-intent callers and keeps the curious-but-unqualified.
- **No state filtering:** callers outside licensed states reach agents who legally cannot sell to them.
- **No minimum-duration discipline:** 8-second calls get full agent attention and full billing weight.

## The Qualification Filter

Check three things before an agent ever hears a ring: caller state against licensed states, campaign minimums, and agent funding. Reject the rest at the ping with a machine-readable reason — no ring, no bill, no waste.

## Key Takeaways

Unbillable traffic is a routing failure, not a lead-vendor failure. Filter before the ring and the same lead budget buys a third more real conversations.`,
  },
  {
    slug: "inbound-routing-engine-nextjs-webrtc",
    title: "Building an Inbound Routing Engine with Next.js, WebRTC, and Low Latency Nodes",
    excerpt: "A deep technical dive into how we achieved sub-150ms voice transport with zero SIP client installations for 50,000+ daily sessions.",
    cover_image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80",
    category: "AI & Automation",
    tags: ["Engineering", "WebRTC"],
    author_name: "Anthony Rivera",
    author_role: "Founding Engineer",
    author_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
    read_minutes: 11,
    featured: false,
    published: true,
    body_markdown: `Fifty thousand sessions a day, no installed softphones, median voice transport under 150ms. Here is the architecture that gets you there.

## The Hot Path

Inbound webhook → immediate caller-leg answer (fire-and-forget) → async routing job → single eligibility query → dial. The webhook returns in under 500ms; everything heavy happens off the request path in a queue worker.

## Atomic Claims Beat Locks

Concurrent duplicate jobs are inevitable at scale. A single compare-and-set state claim (routing → ringing) makes exactly one worker the dialer; losers bail out. No distributed locks, no double dials.

## Browser As The Phone

WebRTC in Chromium removes the entire SIP-client install base: no provisioning, no VPNs, no version drift. Audio unlock needs one user gesture — after that, auto-answer just works.

## Key Takeaways

Keep the request path stupid-fast, push work to queues, claim before dialing, and let the browser be the phone. Latency is a feature, and yours should read like a rounding error.`,
  },
  {
    slug: "hire-compensate-commission-remote-agents",
    title: "Scaling Inbound Sales: How to Hire and Compensate 100% Commission Remote Agents",
    excerpt: "Structure tier commissions, track live leaderboard rankings, and retain top producers with automated disposition workflows.",
    cover_image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=80",
    category: "Agency Growth",
    tags: ["Leadership", "Hiring"],
    author_name: "Rachel Adams",
    author_role: "VP of Sales",
    author_avatar: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80",
    read_minutes: 8,
    featured: false,
    published: true,
    body_markdown: `Commission-only remote agents are the highest-leverage hire in inbound insurance — if you structure the game so winners stay and learners ramp fast.

## Tier The Commissions

Pay on bind quality, not just bind count: full commission for qualified 30-day-persisted policies, half for everything else. Chargebacks stop being fights when the tiers are published on day one.

## Rank Everything Live

A visible leaderboard — calls taken, binds, persistency — does more for output than any SPIF. Top producers compete; middle producers copy; bottom producers self-select out.

## Automate The Boring Parts

Dispositions, payouts, and fee invoices should flow without human touch. Every manual step in the money path is a disagreement waiting to happen — and a reason for a great closer to leave.

## Key Takeaways

Hire for hunger, pay on quality, rank in public, and automate money. Do those four and retention takes care of itself.`,
  },
];

async function main() {
  let created = 0;
  let skipped = 0;
  for (const p of POSTS) {
    const existing = await pool.query("SELECT id FROM app.blog_posts WHERE slug = $1", [p.slug]);
    if (existing.rows.length > 0) { skipped++; continue; }
    await pool.query(
      `INSERT INTO app.blog_posts
        (slug, title, excerpt, cover_image, category, tags, author_name, author_role,
         author_avatar, read_minutes, featured, published, published_at, body_markdown)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now(),$13)`,
      [p.slug, p.title, p.excerpt, p.cover_image, p.category, p.tags, p.author_name,
       p.author_role, p.author_avatar, p.read_minutes, p.featured, p.published, p.body_markdown],
    );
    created++;
    console.log((p.featured ? "[featured] " : "[post]     ") + p.slug);
  }
  console.log(`done: created=${created} skipped=${skipped}`);
  await pool.end();
}

main().catch((e) => { console.error("SEED_FAILED:" + e.message); process.exit(1); });
