import "dotenv/config";
import { Pool } from "pg";

async function check() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const r = await pool.query('SELECT id, email, name, role FROM "user" ORDER BY email');
    console.table(r.rows);
  } finally {
    await pool.end();
  }
}
check().catch(console.error);
