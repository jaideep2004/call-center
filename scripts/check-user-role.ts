import "dotenv/config";
import { Pool } from "pg";

async function check() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const r = await pool.query(
      `SELECT u.id, u.email, u.name, m.role, m.status as membership_status, a.name as agency_name
       FROM "user" u
       LEFT JOIN app.memberships m ON m.user_id = u.id
       LEFT JOIN app.agencies a ON a.id = m.agency_id
       WHERE u.email LIKE '%jaisidhu%'`
    );
    console.log(JSON.stringify(r.rows, null, 2));
  } finally {
    await pool.end();
  }
}
check().catch(console.error);
