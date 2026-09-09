require('dotenv').config();
const { Pool } = require('pg');
(async()=>{
  const pool = new Pool({connectionString: process.env.DATABASE_URL});
  const r = await pool.query(`SELECT conrelid::regclass::text as src, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE contype='f' AND connamespace='app'::regnamespace ORDER BY src`);
  for (const row of r.rows) console.log(row.src + ': ' + row.def);
  await pool.end();
})();
