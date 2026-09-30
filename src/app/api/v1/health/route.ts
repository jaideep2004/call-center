import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

let cache: { at: number; pending: string[] | null } = { at: 0, pending: null };
const CACHE_MS = 60_000;

/** Versions on disk (supabase/migrations/NNNN_*.sql) minus applied rows. */
async function pendingMigrations(): Promise<string[] | null> {
  try {
    const dir = path.join(process.cwd(), "supabase", "migrations");
    const files = (await fs.readdir(dir)).filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort();
    const disk = files.map((f) => f.slice(0, 4));
    const { query } = await import("@/server/db");
    const rows = await query<{ version: string }>("select version from public.schema_migrations");
    const applied = new Set(rows.map((r) => r.version));
    return disk.filter((v) => !applied.has(v));
  } catch {
    return null;
  }
}

export async function GET() {
  const now = Date.now();
  if (now - cache.at > CACHE_MS) {
    cache = { at: now, pending: await pendingMigrations() };
  }
  const body: Record<string, unknown> = {
    status: "ok",
    service: "coverage-calls-web",
    timestamp: new Date().toISOString(),
  };
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "src", "generated", "version.json"), "utf8");
    const v = JSON.parse(raw) as { sha?: string; branch?: string; builtAt?: string };
    body.build = { sha: v.sha ?? "unknown", branch: v.branch ?? "unknown", at: v.builtAt ?? "unknown" };
  } catch {
    body.build = { sha: "unknown" };
  }
  if (cache.pending && cache.pending.length > 0) {
    // Deploy ran ahead of `npm run migrate`: new code may reference schema
    // the database does not have yet (this once took down inbound calls).
    body.migrations_pending = cache.pending;
    body.warning = `Run npm run migrate on the server (pending: ${cache.pending.join(", ")})`;
  }
  return NextResponse.json(body);
}
