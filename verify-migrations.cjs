require("dotenv").config();
const { Client } = require("pg");
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const checks = [
    ["npa_states rows", "SELECT count(*)::int AS n FROM app.npa_states"],
    ["calls.caller_state", "SELECT count(*)::int AS n FROM information_schema.columns WHERE table_schema='app' AND table_name='calls' AND column_name='caller_state'"],
    ["subscription active uq", "SELECT count(*)::int AS n FROM pg_indexes WHERE schemaname='app' AND indexname='agent_subscriptions_active_uq'"],
    ["bid_overrides", "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='app' AND table_name='bid_overrides'"],
    ["agent_fees", "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='app' AND table_name='agent_fees'"],
    ["support_tickets", "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='app' AND table_name='support_tickets'"],
    ["cms_sections", "SELECT count(*)::int AS n FROM app.cms_sections"],
    ["perf indexes (0033)", "SELECT count(*)::int AS n FROM pg_indexes WHERE schemaname='app' AND indexname IN ('idx_calls_provider_agent_call','idx_phone_numbers_campaign','idx_retreaver_calls_link')"],
  ];
  for (const [label, sql] of checks) {
    const r = await c.query(sql);
    console.log(`${label}: ${r.rows[0].n}`);
  }
  await c.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
