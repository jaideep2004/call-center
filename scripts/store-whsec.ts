import "dotenv/config";
import { Client } from "pg";
import { encryptSecret } from "@/server/crypto";

// Stores the Stripe CLI webhook signing secret encrypted so the app
// verifies Stripe signatures locally (same effect as pasting it in
// Admin -> System Settings -> Stripe Integration).
//
// Usage: npx tsx scripts/store-whsec.ts whsec_xxxxx

async function main() {
  const secret = process.argv[2];
  if (!secret || !secret.startsWith("whsec_")) {
    console.error("Usage: npx tsx scripts/store-whsec.ts whsec_...");
    process.exit(1);
  }
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  await c.query(
    `INSERT INTO app.system_settings (key, value, updated_at)
     VALUES ('stripe_webhook_secret', $1::jsonb, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [JSON.stringify(encryptSecret(secret))],
  );
  console.log("OK webhook signing secret stored (encrypted)");
  await c.end();
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
