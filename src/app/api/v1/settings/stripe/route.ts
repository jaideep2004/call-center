import { apiHandler, ok, fail } from "@/server/api-utils";
import { getStripeStatus, saveStripeKeys, setStripeMode, invalidateStripeCache } from "@/server/stripe";
import { z } from "zod";

const PLATFORM_ROLES = ["admin"];

function requirePlatform(role?: string): boolean {
  return Boolean(role && PLATFORM_ROLES.includes(role));
}

/**
 * Platform-level Stripe integration status + key management. Keys are stored
 * encrypted in app.system_settings and never returned to the client.
 */
export const GET = apiHandler(async (_req, { user }) => {
  if (!requirePlatform(user?.role)) return fail("Platform admin required", 403);
  const status = await getStripeStatus();
  return ok(status);
}, { resource: "settings", action: "view" });

const keysSchema = z.object({
  secret_key: z.string().min(10).max(255).optional(),
  webhook_secret: z.string().min(10).max(255).optional(),
  test_secret_key: z.string().min(10).max(255).optional(),
  test_webhook_secret: z.string().min(10).max(255).optional(),
  live_secret_key: z.string().min(10).max(255).optional(),
  live_webhook_secret: z.string().min(10).max(255).optional(),
  mode: z.enum(["test", "live"]).optional(),
});

export const PUT = apiHandler(async (req, { user }) => {
  if (!requirePlatform(user?.role)) return fail("Platform admin required", 403);
  const body = keysSchema.parse(await req.json());
  const pairs: Array<[string | undefined, string]> = [
    [body.secret_key, "secret_key"],
    [body.webhook_secret, "webhook_secret"],
    [body.test_secret_key, "test_secret_key"],
    [body.test_webhook_secret, "test_webhook_secret"],
    [body.live_secret_key, "live_secret_key"],
    [body.live_webhook_secret, "live_webhook_secret"],
  ];
  for (const [v, name] of pairs) {
    if (v && name.endsWith("secret_key") && !v.trim().startsWith("sk_")) return fail("Secret keys should start with sk_…", 400);
    if (v && name.endsWith("webhook_secret") && !v.trim().startsWith("whsec_")) return fail("Webhook secrets should start with whsec_…", 400);
  }
  if (!body.secret_key && !body.webhook_secret && !body.test_secret_key && !body.test_webhook_secret && !body.live_secret_key && !body.live_webhook_secret && !body.mode) {
    return fail("Provide at least one key or a mode", 400);
  }
  await saveStripeKeys({
    secret_key: body.secret_key?.trim(),
    webhook_secret: body.webhook_secret?.trim(),
    test_secret_key: body.test_secret_key?.trim(),
    test_webhook_secret: body.test_webhook_secret?.trim(),
    live_secret_key: body.live_secret_key?.trim(),
    live_webhook_secret: body.live_webhook_secret?.trim(),
  });
  // Mode switch activates that mode's stored pair (fails cleanly when the
  // target mode has no keys yet — nothing is half-switched).
  if (body.mode) {
    try {
      await setStripeMode(body.mode);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return fail(msg.slice(0, 160), 422);
    }
  }
  // Verify the secret key actually works with Stripe before reporting success.
  let verified = false;
  let keyLivemode: boolean | null = null;
  try {
    const stripeModule = await import("@/server/stripe");
    const balance = await (await stripeModule.getStripe()).balance.retrieve();
    verified = true;
    keyLivemode = (balance as { livemode?: boolean }).livemode ?? null;
    invalidateStripeCache();
  } catch {
    invalidateStripeCache();
  }
  const status = await getStripeStatus();
  return ok(
    { saved: true, verified, mode: status.mode, key_livemode: keyLivemode },
    verified
      ? `Keys saved and verified with Stripe (${body.mode ?? status.mode ?? "current"} mode)`
      : "Keys saved but verification failed — check the values",
  );
}, { resource: "settings", action: "manage" });

export const DELETE = apiHandler(async (_req, { user }) => {
  if (!requirePlatform(user?.role)) return fail("Platform admin required", 403);
  await (await import("@/server/repositories")).systemSettings.set("stripe_secret_key", null);
  invalidateStripeCache();
  return ok({ cleared: true }, "Database keys cleared — falling back to environment");
}, { resource: "settings", action: "manage" });

/**
 * POST verify: ping the live Stripe API (balance.retrieve) with the
 * currently configured key (DB or env). The badge is only "Connected" after
 * this succeeds — key presence alone proves nothing.
 */
export const POST = apiHandler(async (_req, { user }) => {
  if (!requirePlatform(user?.role)) return fail("Platform admin required", 403);
  try {
    const stripeModule = await import("@/server/stripe");
    const balance = await (await stripeModule.getStripe()).balance.retrieve();
    const status = await stripeModule.getStripeStatus();
    return ok(
      { verified: true, livemode: (balance as { livemode?: boolean }).livemode ?? null, mode: status.mode },
      `Stripe verified — ${status.mode === "live" ? "LIVE" : status.mode === "test" ? "TEST" : "current"} mode API responded`,
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return fail(`Stripe verification failed: ${msg.slice(0, 160)}`, 502);
  }
}, { resource: "settings", action: "manage" });
