const fs = require("fs");
const { Pool } = require("pg");

const envPath = ".env";
const envRaw = fs.readFileSync(envPath, "utf8");
const url = envRaw.split("\n").map(l => l.trim()).find(l => l.startsWith("DATABASE_URL="))?.replace(/^DATABASE_URL=/, "") || process.env.DATABASE_URL;

if (!url) { console.error("NO DATABASE_URL found"); process.exit(1); }

const pool = new Pool({ connectionString: url });

(async () => {
  const cols = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='app' AND table_name='calls'`
  );
  const names = cols.rows.map(r => r.column_name);
  console.log("columns:", names.join(", "));

  const hasCreated = names.includes("created_at");
  const orderBy = hasCreated ? "created_at" : "started_at";

  const calls = await pool.query(`
    SELECT * FROM app.calls ORDER BY ${orderBy} DESC NULLS LAST LIMIT 3
  `);
  console.log("\n=== RECENT CALLS ===");
  for (const c of calls.rows) {
    const keep = {};
    for (const k of ["id", "state", "agency_id", "agent_id", "provider", "provider_call_id", "provider_agent_call_id", "from_hash", "started_at", "connected_at", "ended_at", "routing_snapshot"]) {
      if (k in c) keep[k] = c[k];
    }
    console.log(JSON.stringify({ ...keep, provider_call_id: String(keep.provider_call_id ?? "").slice(0, 18) }));
  }

  const events = await pool.query(`
    SELECT call_id, provider, type, occurred_at FROM app.call_events
    WHERE occurred_at > NOW() - INTERVAL '4 hours'
    ORDER BY occurred_at DESC LIMIT 60
  `);
  console.log("\n=== RECENT EVENTS (last 4h) ===");
  for (const e of events.rows) {
    const t = e.occurred_at instanceof Date ? e.occurred_at.toISOString().replace("T", " ").slice(0, 19) : String(e.occurred_at);
    console.log(`${t} ${String(e.type).padEnd(16)} ${String(e.call_id).slice(0, 8)}`);
  }

  if (process.argv[2]) {
    const detail = await pool.query(
      `SELECT provider_event_id, type, raw_redacted->'data'->>'event_type' AS evt, occurred_at,
              raw_redacted->'data'->'payload' AS payload
       FROM app.call_events WHERE call_id = $1 ORDER BY occurred_at`,
      [process.argv[2]]
    );
    console.log(`\n=== EVENT TRAIL FOR ${String(process.argv[2]).slice(0, 8)} ==="`);
    for (const x of detail.rows) {
      const t = x.occurred_at instanceof Date ? x.occurred_at.toISOString().replace("T", " ").slice(11, 19) : String(x.occurred_at);
      console.log(`${t} ${String(x.evt).padEnd(26)} normalized=${String(x.type).padEnd(16)} ${x.provider_event_id}`);
      if (x.payload) console.log("    payload:", JSON.stringify(x.payload).slice(0, 400));
    }
  }

  const recs = await pool.query(
    `SELECT call_id, storage_path, content_type FROM app.recordings ORDER BY (SELECT max(occurred_at) FROM app.call_events e WHERE e.call_id = app.recordings.call_id) DESC NULLS LAST LIMIT 5`
  );
  console.log("\n=== RECORDINGS ===");
  if (recs.rows.length === 0) console.log("(none)");
  for (const r of recs.rows) console.log(JSON.stringify(r));
  await pool.end();
})().catch(e => { console.error("QUERY FAILED:", e.message); pool.end(); process.exit(1); });
