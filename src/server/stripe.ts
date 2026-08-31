import Stripe from "stripe";
import { systemSettings } from "@/server/repositories/system-settings";
import { decryptSecret, encryptSecret } from "@/server/crypto";

/**
 * Stripe client resolution order (per key):
 *   1. app.system_settings (admin-configured via UI, encrypted at rest)
 *   2. process.env.STRIPE_* fallback
 * Resolved keys are cached for 60s; saving new keys in the admin UI calls
 * invalidateStripeCache() so changes apply immediately.
 */

let client: Stripe | null = null;
let lastSecretKey: string | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60_000;

async function resolveKey(kind: "secret_key" | "webhook_secret"): Promise<{ value: string | null; source: "db" | "env" | null }> {
  try {
    const stored = await systemSettings.get(`stripe_${kind}`);
    if (typeof stored === "string" && stored) {
      try {
        return { value: decryptSecret(stored), source: "db" };
      } catch {
        // Stored as plaintext (e.g. seeded manually) — use as-is.
        return { value: stored, source: "db" };
      }
    }
  } catch {
    // Settings table unavailable — fall through to env.
  }
  const envName = kind === "secret_key" ? "STRIPE_SECRET_KEY" : "STRIPE_WEBHOOK_SECRET";
  const v = process.env[envName];
  return v ? { value: v, source: "env" } : { value: null, source: null };
}

export async function getStripe(): Promise<Stripe> {
  if (client && Date.now() - cachedAt < CACHE_TTL_MS) return client;

  const { value } = await resolveKey("secret_key");
  if (!value) {
    throw new Error("Stripe is not configured — set the secret key in Admin → System Settings → Integrations, or via STRIPE_SECRET_KEY");
  }
  if (!client || value !== lastSecretKey) {
    client = new Stripe(value);
    lastSecretKey = value;
  }
  cachedAt = Date.now();
  return client;
}

export async function getWebhookSecret(): Promise<string> {
  const { value } = await resolveKey("webhook_secret");
  if (!value) {
    throw new Error("Stripe webhook secret is not configured — set it in Admin → System Settings → Integrations, or via STRIPE_WEBHOOK_SECRET");
  }
  return value;
}

export async function getStripeStatus(): Promise<{
  configured: boolean;
  source: "db" | "env" | null;
  webhook_configured: boolean;
}> {
  const key = await resolveKey("secret_key");
  const wh = await resolveKey("webhook_secret");
  return {
    configured: Boolean(key.value),
    source: key.source,
    webhook_configured: Boolean(wh.value),
  };
}

export async function saveStripeKeys(keys: { secret_key?: string; webhook_secret?: string }): Promise<void> {
  if (keys.secret_key) await systemSettings.set("stripe_secret_key", encryptSecret(keys.secret_key));
  if (keys.webhook_secret) await systemSettings.set("stripe_webhook_secret", encryptSecret(keys.webhook_secret));
  invalidateStripeCache();
}

export function invalidateStripeCache(): void {
  client = null;
  lastSecretKey = null;
  cachedAt = 0;
}
