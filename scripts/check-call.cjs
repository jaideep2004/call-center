require("dotenv").config();
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
  const r = await pool.query(
    "SELECT id, state, provider, provider_call_id, provider_agent_call_id, agent_id, campaign_id, connected_at, ended_at, routing_snapshot FROM app.calls WHERE started_at > now() - interval '6 hours' ORDER BY started_at DESC LIMIT 3"
  );
  console.log(JSON.stringify(r.rows, null, 2));
  await pool.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
