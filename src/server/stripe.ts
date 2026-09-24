import Stripe from "stripe";
import { systemSettings } from "@/server/repositories/system-settings";
import { decryptSecret, encryptSecret } from "@/server/crypto";

/**
 * Stripe client resolution order (per key):
 *   1. app.system_settings (admin-configured via UI, encrypted at rest)
 *   2. process.env.STRIPE_* fallback
 * Resolved keys are cached for 60s; saving new keys in the admin UI calls
 * invalidateStripeCache() so changes apply immediately.
 *
 * Test/live modes: the admin stores a key pair per mode
 * (stripe_{test,live}_secret_key + stripe_{test,live}_webhook_secret) and
 * selects the active mode. The active mode's keys are mirrored into the
 * legacy stripe_secret_key / stripe_webhook_secret slots, so every existing
 * code path keeps working unchanged and `stripe_mode` is the single switch.
 */

export type StripeMode = "test" | "live";

let client: Stripe | null = null;
let lastSecretKey: string | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60_000;

async function storedSetting(key: string): Promise<string | null> {
  try {
    const stored = await systemSettings.get(`stripe_${key}`);
    if (typeof stored === "string" && stored) {
      try {
        return decryptSecret(stored);
      } catch {
        // Stored as plaintext (e.g. seeded manually) — use as-is.
        return stored;
      }
    }
  } catch {
    // Settings table unavailable — fall through to env.
  }
  return null;
}

async function resolveKey(kind: "secret_key" | "webhook_secret"): Promise<{ value: string | null; source: "db" | "env" | null }> {
  const mode = await getStripeMode().catch(() => null);
  if (mode) {
    // Mode set: prefer that mode's pair, fall back to the legacy active slot.
    const scoped = await storedSetting(`${mode}_${kind}`);
    if (scoped) return { value: scoped, source: "db" };
  }
  const stored = await storedSetting(kind);
  if (stored) return { value: stored, source: "db" };
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
  mode: StripeMode | null;
  test_configured: boolean;
  live_configured: boolean;
  /** Best-effort guess from the active secret prefix (sk_live/sk_test). */
  active_key_mode: StripeMode | null;
}> {
  const key = await resolveKey("secret_key");
  const wh = await resolveKey("webhook_secret");
  const mode = await getStripeMode().catch(() => null);
  const [testKey, liveKey] = await Promise.all([
    storedSetting("test_secret_key").catch(() => null),
    storedSetting("live_secret_key").catch(() => null),
  ]);
  const active = key.value ?? "";
  return {
    configured: Boolean(key.value),
    source: key.source,
    webhook_configured: Boolean(wh.value),
    mode,
    test_configured: Boolean(testKey),
    live_configured: Boolean(liveKey),
    active_key_mode: active.startsWith("sk_live") ? "live" : active.startsWith("sk_test") || active.startsWith("sk_") ? "test" : null,
  };
}

/** Active mode, or null when never switched (legacy single-key behavior). */
export async function getStripeMode(): Promise<StripeMode | null> {
  try {
    const v = await systemSettings.get("stripe_mode");
    return v === "test" || v === "live" ? v : null;
  } catch {
    return null;
  }
}

/**
 * Switch the active mode. Copies that mode's stored pair into the legacy
 * active slots (so checkout/webhook code needs no changes) and records the
 * mode. Throws when the target mode has no keys saved yet.
 */
export async function setStripeMode(mode: StripeMode): Promise<void> {
  const [secret, webhook] = await Promise.all([
    storedSetting(`${mode}_secret_key`),
    storedSetting(`${mode}_webhook_secret`),
  ]);
  if (!secret) throw new Error(`No ${mode} secret key saved yet — paste it first`);
  await systemSettings.set("stripe_secret_key", encryptSecret(secret));
  if (webhook) await systemSettings.set("stripe_webhook_secret", encryptSecret(webhook));
  await systemSettings.set("stripe_mode", mode);
  invalidateStripeCache();
}

export async function saveStripeKeys(keys: {
  secret_key?: string;
  webhook_secret?: string;
  test_secret_key?: string;
  test_webhook_secret?: string;
  live_secret_key?: string;
  live_webhook_secret?: string;
}): Promise<void> {
  if (keys.secret_key) await systemSettings.set("stripe_secret_key", encryptSecret(keys.secret_key));
  if (keys.webhook_secret) await systemSettings.set("stripe_webhook_secret", encryptSecret(keys.webhook_secret));
  if (keys.test_secret_key) await systemSettings.set("stripe_test_secret_key", encryptSecret(keys.test_secret_key));
  if (keys.test_webhook_secret) await systemSettings.set("stripe_test_webhook_secret", encryptSecret(keys.test_webhook_secret));
  if (keys.live_secret_key) await systemSettings.set("stripe_live_secret_key", encryptSecret(keys.live_secret_key));
  if (keys.live_webhook_secret) await systemSettings.set("stripe_live_webhook_secret", encryptSecret(keys.live_webhook_secret));
  invalidateStripeCache();
}

export function invalidateStripeCache(): void {
  client = null;
  lastSecretKey = null;
  cachedAt = 0;
}
