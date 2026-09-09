
const {Pool}=require('pg');
require('dotenv').config();
(async()=>{
  const p=new Pool({connectionString:process.env.DATABASE_URL});
  await p.query("insert into public.schema_migrations(version) values ('0043') on conflict do nothing");
  const r=await p.query("select version from public.schema_migrations order by version");
  console.log(r.rows.map(x=>x.version).join(', '));
  await p.end();
})();
