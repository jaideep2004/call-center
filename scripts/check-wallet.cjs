require("dotenv").config();
const { Client } = require("pg");

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query("SELECT * FROM app.wallet_entries WHERE provider_reference LIKE 'pi_test_%' ORDER BY created_at DESC LIMIT 5");
  console.log(JSON.stringify(r.rows, null, 2));
  await c.end();
})().catch((e) => { console.error(e.message); process.exit(1); });