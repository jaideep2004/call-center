const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/call_center" });
pool.query("SELECT id, state, agent_id, routing_snapshot, from_hash, to_number FROM app.calls ORDER BY created_at DESC LIMIT 3").then(r => {
  console.log(JSON.stringify(r.rows, null, 2));
  pool.end();
}).catch(e => { console.error(e.message); pool.end(); });
