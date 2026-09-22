// Seed the CMS `faq` section (idempotent — overwrites items, preserves id).
// Usage: node scripts/seed-faq.mjs   (uses .env DATABASE_URL)
import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ITEMS = [
  {
    category: "Voice & WebRTC",
    question: "How does browser WebRTC work without desk phones or desktop SIP clients?",
    answer: "Coverage Calls uses low-latency WebRTC technology directly inside modern web browsers (Chrome, Edge, Safari, Firefox). When an inbound caller dials your campaign number, voice audio is routed into encrypted audio channels in under 150ms. Your agents just plug in any USB headset and click 'Answer' — no PBX boxes, desktop softphones, or SIP trunk configuration needed.",
  },
  {
    category: "Billing & Leads",
    question: "How does billable call verification work?",
    answer: "You only pay for qualified, billable conversations that meet your custom connection threshold (e.g. connected for over 90–120 seconds with confirmed intent). Our routing engine automatically disqualifies duplicate calls, spam, and disconnected lines before they hit your agent's live screen.",
  },
  {
    category: "AI & Features",
    question: "What is AI Whisper Coaching and how does it assist agents during live calls?",
    answer: "Our low-latency AI Copilot transcribes the conversation in real time. It displays script adherence suggestions, detects prospect sentiment, and feeds instant rebuttals and coverage benefit bullets directly on the agent workspace without interrupting audio flow.",
  },
  {
    category: "Voice & WebRTC",
    question: "Can I integrate Coverage Calls with my existing agency CRM?",
    answer: "Yes. We offer webhooks and direct integrations for AgencyBloc, HubSpot, Salesforce, GoHighLevel, and Zapier. Contact records, call recordings, AI summaries, and disposition tags sync instantly the second a call finishes.",
  },
  {
    category: "Security & TCPA",
    question: "Is Coverage Calls TCPA compliant and HIPAA ready?",
    answer: "Yes. All voice streams, call recordings, and transcripts are encrypted at rest with AES-256 and in transit with TLS 1.3 / SRTP. We maintain strict TCPA compliance logging with exact timestamp verification, caller consent records, and automated DNC scrubber integration.",
  },
  {
    category: "Billing & Leads",
    question: "How does the 7-day free trial work and can I cancel anytime?",
    answer: "Every plan includes full access to the agent workspace, browser calling, analytics dashboard, and AI call notes for 7 days. You can invite your team, test inbound routing, and cancel at any time with a single click in your settings dashboard — no long-term lock-in contracts.",
  },
];

async function main() {
  const existing = await pool.query("SELECT id FROM app.cms_sections WHERE slug = 'faq' LIMIT 1");
  const content = JSON.stringify({ items: ITEMS });
  if (existing.rows.length > 0) {
    await pool.query(
      "UPDATE app.cms_sections SET title = 'FAQ', content = $1::jsonb, active = true, updated_at = now() WHERE slug = 'faq'",
      [content],
    );
    console.log("faq section updated with 6 items");
  } else {
    await pool.query(
      "INSERT INTO app.cms_sections (slug, title, content, active) VALUES ('faq', 'FAQ', $1::jsonb, true)",
      [content],
    );
    console.log("faq section created with 6 items");
  }
  await pool.end();
}

main().catch((e) => { console.error("SEED_FAILED:" + e.message); process.exit(1); });
