import 'dotenv/config';
import { Pool } from 'pg';
const pool = new Pool({connectionString: process.env.DATABASE_URL});
async function main(){
  const agencyId = '951dff1d-04fb-44ab-8342-49b16e039f11';
  const users = [
    {email:'manager.test@relayline.test', role:'manager'},
    {email:'finance.test@relayline.test', role:'finance'},
    {email:'publisher.test@relayline.test', role:'publisher'},
  ];
  for(const u of users){
    let row = (await pool.query(`SELECT id FROM "user" WHERE email=$1`, [u.email])).rows[0];
    if(!row){
      console.log('missing', u.email, '— creating via sign-up API already done?');
      continue;
    }
    await pool.query(`UPDATE "user" SET role=$1, "emailVerified"=true WHERE id=$2`, [u.role, row.id]);
    console.log('updated', u.email, 'to', u.role);
    const memRole = u.role === 'publisher' ? 'agent' : u.role;
    const mem = (await pool.query(`SELECT id FROM app.memberships WHERE user_id=$1`, [row.id])).rows[0];
    if(!mem){
      const { randomUUID } = await import('crypto');
      const id = randomUUID();
      await pool.query(`INSERT INTO app.memberships (id, user_id, agency_id, role, status) VALUES ($1,$2,$3,$4,'active')`, [id, row.id, agencyId, memRole]);
      console.log('created membership', u.email);
    } else {
      await pool.query(`UPDATE app.memberships SET role=$1, agency_id=$2, status='active' WHERE user_id=$3`, [memRole, agencyId, row.id]);
      console.log('updated membership', u.email);
    }
  }
  // also ensure gdshosting agent has correct role
  await pool.query(`UPDATE "user" SET role='agent', "emailVerified"=true WHERE email='gdshosting@gmail.com'`);
  await pool.query(`UPDATE "user" SET role='agent', "emailVerified"=true WHERE email='jai2004bgmi@gmail.com'`);
  // ensure sign-up for finance/publisher if not exists — create via direct insert if missing
  for(const u of users.slice(1)){
    let row = (await pool.query(`SELECT id FROM "user" WHERE email=$1`, [u.email])).rows[0];
    if(!row){
      console.log('still missing', u.email, 'need to create');
    }
  }
  await pool.end();
}
main().catch(e=>{console.error(e); process.exit(1)});
