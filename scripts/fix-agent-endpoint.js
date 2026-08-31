require("dotenv").config({ path: ".env" });
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  await pool.query("UPDATE app.agents SET endpoint_types = $1", ["{webrtc}"]);
  console.log('Updated all agents: endpoint_types = ["webrtc"]');

  const check = await pool.query("SELECT id, endpoint_types FROM app.agents LIMIT 5");
  check.rows.forEach((a) => {
    console.log("  id:", a.id.slice(0, 12) + "...", "endpoint_types:", JSON.stringify(a.endpoint_types));
  });
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });