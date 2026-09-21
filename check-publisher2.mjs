import 'dotenv/config';
import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function main() {
  const pub = await pool.query('SELECT id, name, user_id, active, deleted_at FROM app.publishers ORDER BY id DESC LIMIT 20');
  console.log('Publishers:');
  console.table(pub.rows);
  const users = await pool.query('SELECT id, email, role FROM "user" WHERE role IN ($1,$2)');
  console.log('Users publisher/agent:');
  console.table(users.rows);
  const rc = await pool.query('SELECT publisher_id, COUNT(*) FROM app.retreaver_calls GROUP BY publisher_id');
  console.log('Retreaver calls per publisher:');
  console.table(rc.rows);
  const calls = await pool.query('SELECT COUNT(*) FROM app.retreaver_calls');
  console.log('Total retreaver_calls:', calls.rows[0].count);
  await pool.end();
}
main().catch(e=>{ console.error(e); process.exit(1); });
