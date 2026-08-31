// Destructive dev/local database bootstrap.
// Drops app + jobs schemas and all Better Auth tables, then rebuilds the schema
// from EVERY migration in supabase/migrations (0001→latest) via the shared
// runner (scripts/run-migrations.cjs), applies the latest Better Auth migration,
// and seeds a default agency.
//
// Safety:
//   - Refuses to run when NODE_ENV=production.
//   - Requires an explicit --yes flag; the script drops schemas.
//
// Usage: npm run seed -- --yes
import "dotenv/config";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { Pool } from "pg";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed: NODE_ENV=production. Seed drops schemas and is destructive.");
  process.exit(1);
}
if (!process.argv.includes("--yes")) {
  console.error("Refusing to seed without confirmation — this DROPS app + jobs schemas and all auth tables.");
  console.error("Usage: npm run seed -- --yes");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set — copy .env.example to .env and fill it in first.");
  process.exit(1);
}

function findBetterAuthMigration(): string | null {
  const dir = resolve("better-auth_migrations");
  try {
    const files = readdirSync(dir).filter((f: string) => f.endsWith(".sql")).sort();
    return files.length > 0 ? resolve(dir, files[files.length - 1]) : null;
  } catch {
    return null;
  }
}

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    // 1. Drop Better Auth tables and the platform schemas (no data yet)
    console.log("Dropping Better Auth tables...");
    await client.query("DROP TABLE IF EXISTS public.verification, public.account, public.session, public.user CASCADE");

    console.log("Dropping app + jobs schemas...");
    await client.query("DROP SCHEMA IF EXISTS app CASCADE; DROP SCHEMA IF EXISTS jobs CASCADE");

    // 2. Drop any recorded versions so the runner re-applies everything from scratch
    await client.query("DROP TABLE IF EXISTS public.schema_migrations");
    console.log("Version table cleared.");

    // 3. Rebuild the schema via the shared runner (applies 0001→latest, transactional)
    const runner = resolve(__dirname, "..", "..", "scripts", "run-migrations.cjs");
    console.log("Running migrations...");
    const res = spawnSync(process.execPath, [runner], { stdio: "inherit", cwd: process.cwd() });
    if (res.error) throw res.error;
    if (res.status !== 0) throw new Error(`Migration runner exited with code ${res.status} — aborting seed`);

    // 4. Recreate Better Auth tables from the latest generated migration
    console.log("Setting up Better Auth tables...");
    const baPath = findBetterAuthMigration();
    if (baPath) {
      await client.query(readFileSync(baPath, "utf-8"));
      console.log("Better Auth tables created.");
    } else {
      console.log("No Better Auth migration found. Skipping.");
    }

    // 5. Seed default agency
    const existing = await client.query("SELECT id FROM app.agencies LIMIT 1");
    if (existing.rows.length === 0) {
      await client.query("INSERT INTO app.agencies (name, slug) VALUES ($1, $2)", ["My Agency", "my-agency"]);
      console.log("Default agency created: My Agency (my-agency)");
    } else {
      console.log("Agency already exists, skipping.");
    }

    console.log("");
    console.log("Database fully set up. Next steps:");
    console.log("  1. Start the app: npm run dev");
    console.log("  2. Register at the URL npm run dev prints");
    console.log("  3. Get your user ID from Supabase: SELECT id FROM public.user;");
    console.log("  4. Promote to admin:");
    console.log("     curl -X POST http://localhost:30001/api/v1/setup/make-admin \\");
    console.log('       -H "Content-Type: application/json" \\');
    console.log('       -d \'{"user_id":"<uuid>","role":"super_admin"}\'');
    console.log("  5. Refresh the dashboard at http://localhost:30001/dashboard");
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();