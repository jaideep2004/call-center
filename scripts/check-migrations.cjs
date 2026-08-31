// Migration drift check — wire into CI.
// Usage: node scripts/check-migrations.cjs
//
// Exit code 1 when either:
//   - migration files break numbering (missing/duplicate/non-contiguous versions), or
//   - a migration file on disk is not recorded in public.schema_migrations.
//
// Advisory: marker probes (key objects that must exist per migration) are printed
// to suggest `npm run migrate -- --backfill` for DBs migrated by hand before the
// version table existed.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const { probeMarkers } = require("./lib/migration-markers.cjs");

const MIGRATIONS_DIR = path.resolve(__dirname, "..", "supabase", "migrations");

function checkFiles() {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{4}_.+\.sql$/.test(f))
    .sort();
  const versions = files.map((f) => f.slice(0, 4));
  const errors = [];

  if (new Set(versions).size !== versions.length) {
    errors.push("duplicate version prefixes");
  }
  for (let i = 0; i < versions.length; i++) {
    const expected = String(i + 1).padStart(4, "0");
    if (versions[i] !== expected) {
      errors.push(`${files[i]} — expected version ${expected}`);
      break;
    }
  }
  return { files, versions, errors };
}

(async () => {
  const { files, versions, errors } = checkFiles();
  if (errors.length) {
    console.error("Migration file lint FAILED:");
    for (const e of errors) console.error(`  - ${e}`);
    process.exitCode = 1;
  } else {
    console.log(`File lint ok (${files.length} migrations, 0001→${versions[versions.length - 1]}).`);
  }

  if (!process.env.DATABASE_URL) {
    console.log("DATABASE_URL not set — skipping DB comparison (run with .env for full check).");
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  let recorded = new Set();
  try {
    const { rows } = await pool.query("select version from public.schema_migrations");
    recorded = new Set(rows.map((r) => r.version));
  } catch (e) {
    if (e.code !== "42P01") throw e; // 42P01 = relation does not exist
  }

  const missing = versions.filter((v) => !recorded.has(v));
  const unknown = [...recorded].filter((v) => !versions.includes(v)).sort();

  if (missing.length) {
    console.error(`Missing from schema_migrations (${missing.length}/${versions.length} recorded): ${missing.join(", ")}`);
    try {
      const markerOk = await probeMarkers(pool);
      const adoptable = missing.filter((v) => markerOk[v] === true);
      if (adoptable.length) {
        console.log(`  marker-verified and safe to record: ${adoptable.join(", ")}`);
        console.log("  -> run: npm run migrate -- --backfill   (then re-run this check)");
      }
    } catch (e) {
      console.log(`  (marker probe unavailable: ${e.message})`);
    }
    process.exitCode = 1;
  } else {
    console.log(`schema_migrations: all ${versions.length} migration files recorded.`);
  }

  if (unknown.length) {
    console.warn(`Advisory: recorded versions with no file on disk (stale/removed files): ${unknown.join(", ")}`);
  }
})().catch((e) => { console.error(e.message); process.exit(1); });