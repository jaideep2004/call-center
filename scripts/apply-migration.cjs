// Usage: node scripts/apply-migration.cjs supabase/migrations/0027_public_leads_and_rls.sql
// Applies a single migration file against DATABASE_URL (from .env), statement by
// statement, printing each result. Idempotent migrations are safe to re-run.
// NOTE: superseded by scripts/run-migrations.cjs (versioned, transactional).
// Kept for ad-hoc hotfix files that are not part of the migration sequence.
require("dotenv").config();
const fs = require("fs");
const { Pool } = require("pg");
const { splitStatements } = require("./lib/split-statements.cjs");

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/apply-migration.cjs <migration.sql>");
  process.exit(1);
}

const sql = fs.readFileSync(file, "utf8");
const statements = splitStatements(sql);

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  let applied = 0;
  for (const stmt of statements) {
    const label = stmt.split("\n")[0].slice(0, 90);
    try {
      await pool.query(stmt);
      applied += 1;
      console.log(`ok: ${label}`);
    } catch (e) {
      console.error(`FAILED: ${label}`);
      console.error(e.message);
      process.exitCode = 1;
      break;
    }
  }
  await pool.end();
  console.log(applied === statements.length
    ? `Applied ${applied}/${statements.length} statements from ${file}`
    : `Stopped after ${applied}/${statements.length} statements (re-run is safe — migration is idempotent)`);
})().catch((e) => { console.error(e); process.exit(1); });
