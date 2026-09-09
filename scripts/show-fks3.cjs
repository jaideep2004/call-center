require('dotenv').config();
const { Pool } = require('pg');
(async()=>{
  const pool = new Pool({connectionString: process.env.DATABASE_URL});
  const r = await pool.query(`SELECT conrelid::regclass::text as src, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE contype='f' ORDER BY src`);
  for (const row of r.rows) if (row.src.includes('agent_fees') || row.src.includes('affiliates') || row.src.includes('disposition') || row.src.includes('leads')) console.log(row.src + ': ' + row.def);
  await pool.end();
})();
