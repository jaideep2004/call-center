// Migration runner — the single path for applying supabase/migrations to a DB.
//
// Usage:
//   node scripts/run-migrations.cjs            apply pending migrations
//   node scripts/run-migrations.cjs --dry-run  list pending without applying
//   node scripts/run-migrations.cjs --backfill record versions whose marker
//                                              probes already pass (adopts a
//                                              hand-migrated DB into the table)
//
// Behavior:
//   - Tracks applied versions in public.schema_migrations (version PK, applied_at).
//   - Applies each pending file 0001→N in one transaction (all statements + the
//     version record commit together; a failure rolls the whole file back).
//   - Never re-applies a recorded version. Migrations stay idempotent-friendly by
//     convention, but the runner does not depend on idempotency.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const { splitStatements } = require("./lib/split-statements.cjs");
const { probeMarkers } = require("./lib/migration-markers.cjs");

const MIGRATIONS_DIR = path.resolve(__dirname, "..", "supabase", "migrations");

function listMigrationFiles() {
  return fs.readdirSync(MIGRATIONS_DIR).filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort();
}

(async () => {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set — copy .env.example to .env and fill it in first.");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const backfill = args.includes("--backfill");

  const files = listMigrationFiles();
  if (!files.length) {
    console.error(`No migrations found in ${MIGRATIONS_DIR}`);
    process.exit(1);
  }
  const versions = files.map((f) => f.slice(0, 4));

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  try {
    await pool.query(`create table if not exists public.schema_migrations (
      version text primary key,
      applied_at timestamptz not null default now()
    )`);

    const { rows } = await pool.query("select version from public.schema_migrations");
    const applied = new Set(rows.map((r) => r.version));
    let pending = versions.filter((v) => !applied.has(v));

    if (backfill) {
      if (!pending.length) {
        console.log("No pending versions — nothing to backfill.");
      } else {
        const markerOk = await probeMarkers(pool);
        const safe = pending.filter((v) => markerOk[v] === true);
        if (!safe.length) {
          console.log("No pending version matches an existing schema marker — nothing safe to backfill.");
          console.log("(Backfill only records versions whose key objects already exist in the DB.)");
        } else {
          const client = await pool.connect();
          try {
            await client.query("BEGIN");
            for (const v of safe) {
              await client.query("insert into public.schema_migrations (version) values ($1)", [v]);
            }
            await client.query("COMMIT");
            console.log(`Backfilled ${safe.length} version(s) with existing markers: ${safe.join(", ")}`);
          } catch (e) {
            await client.query("ROLLBACK");
            throw e;
          } finally {
            client.release();
          }
          pending = versions.filter((v) => !safe.includes(v));
        }
      }
    }

    if (dryRun) {
      console.log(pending.length
        ? `Pending (${pending.length}): ${pending.join(", ")}`
        : "No pending migrations — schema_migrations is up to date.");
      if (pending.length) {
        for (const v of pending) {
          const file = files.find((f) => f.startsWith(v + "_"));
          console.log(`  ${file}`);
        }
        console.log("\nRun without --dry-run to apply them.");
      }
      return;
    }

    if (!pending.length) {
      console.log("All migrations applied (schema_migrations up to date).");
      return;
    }

    let appliedCount = 0;
    for (const v of pending) {
      const file = files.find((f) => f.startsWith(v + "_"));
      const label = `${v} ${file.replace(/^\d{4}_/, "").replace(/\.sql$/, "")}`;
      const statements = splitStatements(fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8"));
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        for (const stmt of statements) await client.query(stmt);
        await client.query("insert into public.schema_migrations (version) values ($1)", [v]);
        await client.query("COMMIT");
        appliedCount += 1;
        console.log(`applied ${label} (${statements.length} statement${statements.length === 1 ? "" : "s"})`);
      } catch (e) {
        await client.query("ROLLBACK");
        console.error(`FAILED ${label}: ${e.message}`);
        console.error("File was rolled back. Fix it and re-run — already-recorded versions are skipped.");
        process.exitCode = 1;
        break;
      } finally {
        client.release();
      }
    }

    if (!process.exitCode) {
      console.log(`\nApplied ${appliedCount} pending migration(s).`);
    }
  } finally {
    await pool.end();
  }
})().catch((e) => { console.error(e.message); process.exit(1); });