// Seed the CMS `terms` section body (idempotent).
// Usage: node scripts/seed-terms.mjs   (uses .env DATABASE_URL)
import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const BODY = `# Terms of Service

**Last Updated: September 23, 2026**

Welcome to CoverageCalls.com ("Coverage Calls", "we", "us"). These Terms govern your access to and use of our call operations platform, including agent workspaces, publisher portals, billing, and APIs. By creating an account or using the service, you agree to these Terms.

## 1. Accounts & Roles

- You must provide accurate registration information and keep your credentials confidential.
- Accounts carry one role: **admin** (platform owner), **agent** (takes calls), or **publisher** (sends traffic). Agency heads are agents with headship over their agency.
- You are responsible for all activity under your account. Notify us immediately of unauthorized use.

## 2. Acceptable Use

- You will use the platform only for lawful inbound call operations.
- **TCPA & DNC compliance is your responsibility.** You must maintain caller consent records, honor do-not-call requests, and scrub against applicable DNC lists. We provide timestamp logging and consent tooling to help, but legal compliance remains with you and your agency.
- You will not attempt to disrupt the service, probe other tenants' data, resell access without authorization, or upload malicious content.

## 3. Billing

- Wallet top-ups are processed via Stripe; a 3% processing fee is shown separately at checkout and the wallet is credited the net amount.
- Postpaid agencies are billed after usage via weekly invoices (due Monday, emailed automatically). Prepaid agents are charged per-call from wallet balance.
- Calls below a campaign's minimum connected duration bill **$0**. Disputed calls are marked and reviewed, never silently billed.
- Chargebacks and refunds are handled case by case; contact support from your dashboard.

## 4. Call Recordings & Data

- Calls may be recorded where the campaign enables it. Retention defaults to 90 days and recordings are purged automatically after the retention window.
- We process caller metadata (hashed where possible) solely to route, bill, and report on calls. Raw caller numbers are never stored in event logs.

## 5. Availability & Support

- We target 99.9% platform uptime but do not guarantee uninterrupted service; telephony depends on third-party carriers (e.g. Telnyx, Retreaver).
- Support is available via in-dashboard tickets with best-effort response times.

## 6. Termination

- You may close your account at any time. We may suspend accounts for non-payment, abuse, fraud, or legal violations, with notice where practical.
- On termination, wallet balances are settled per the billing terms above; historical invoices remain available to admins.

## 7. Changes

We may update these Terms; material changes will be announced in-app. Continued use after changes take effect constitutes acceptance.

Questions: open a support ticket from your dashboard or email the team.`;

async function main() {
  const existing = await pool.query("SELECT id FROM app.cms_sections WHERE slug = 'terms' LIMIT 1");
  const content = JSON.stringify({ body: BODY });
  if (existing.rows.length > 0) {
    await pool.query(
      "UPDATE app.cms_sections SET title = 'Terms of Service', content = $1::jsonb, active = true, updated_at = now() WHERE slug = 'terms'",
      [content],
    );
    console.log("terms section updated");
  } else {
    await pool.query(
      "INSERT INTO app.cms_sections (slug, title, content, active) VALUES ('terms', 'Terms of Service', $1::jsonb, true)",
      [content],
    );
    console.log("terms section created");
  }
  await pool.end();
}

main().catch((e) => { console.error("SEED_FAILED:" + e.message); process.exit(1); });
