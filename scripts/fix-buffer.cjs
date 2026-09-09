require('dotenv').config();
const { Pool } = require('pg');
(async()=>{
  const p=new Pool({connectionString:process.env.DATABASE_URL});
  await p.query("ALTER TABLE app.campaigns ADD COLUMN IF NOT EXISTS buffer_seconds int not null default 30 check (buffer_seconds >= 0)");
  console.log("buffer_seconds added or already exists");
  const r=await p.query("SELECT column_name FROM information_schema.columns WHERE table_schema='app' AND table_name='campaigns' ORDER BY ordinal_position");
  console.log(r.rows.map(x=>x.column_name).join(', '));
  await p.end();
})();
