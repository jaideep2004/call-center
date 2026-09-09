require('dotenv').config();
const { Pool } = require('pg');
(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const q = async (sql) => (await pool.query(sql)).rows;
  const tables = (await q(`SELECT schemaname, tablename FROM pg_tables WHERE schemaname IN ('app','public') ORDER BY schemaname, tablename`)).map(r=>`${r.schemaname}.${r.tablename}`);
  console.log(tables.join('\n'));
  console.log('\n--- app counts ---');
  for (const t of tables.filter(t=>t.startsWith('app.'))) {
    try {
      const r = await pool.query(`SELECT count(*)::int as c FROM ${t}`);
      console.log(`${t}: ${r.rows[0].c}`);
    } catch(e){ console.log(`${t}: error ${e.message.slice(0,120)}`)}
  }
  console.log('\n--- public (better-auth) counts ---');
  for (const t of ['public.user','public.session','public.account','public.verification']) {
    try {
      const r = await pool.query(`SELECT count(*)::int as c FROM ${t}`);
      console.log(`${t}: ${r.rows[0].c}`);
    } catch(e){ console.log(`${t}: error ${e.message.slice(0,120)}`)}
  }
  await pool.end();
})();
