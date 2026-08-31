import { hashPassword } from '@better-auth/utils/password';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();
const pool = new Pool({connectionString: process.env.DATABASE_URL});
async function main(){
  const pwd = 'Test1234!';
  const hash = await hashPassword(pwd);
  console.log('hash for Test1234! ->', hash.slice(0,40)+'...');
  // Update existing accounts to known password so we can login via API
  const users = await pool.query(`SELECT id, email FROM "user"`);
  console.log('users', users.rows.map(r=>r.email));
  for(const u of users.rows){
    const acc = await pool.query(`SELECT id FROM account WHERE "userId"=$1 AND "providerId"='credential'`, [u.id]);
    if(acc.rows.length){
      await pool.query(`UPDATE account SET password=$1, "updatedAt"=NOW() WHERE "userId"=$2`, [hash, u.id]);
      console.log('updated', u.email);
    } else {
      console.log('no credential account for', u.email);
    }
  }
}
main().catch(e=>{console.error(e); process.exit(1)}).finally(()=>pool.end());
