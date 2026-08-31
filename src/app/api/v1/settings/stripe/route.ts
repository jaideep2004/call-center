import { apiHandler, ok, fail } from "@/server/api-utils";
import { getStripeStatus, saveStripeKeys, invalidateStripeCache } from "@/server/stripe";
import { z } from "zod";

const PLATFORM_ROLES = ["super_admin", "admin"];

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
});

export const PUT = apiHandler(async (req, { user }) => {
  if (!requirePlatform(user?.role)) return fail("Platform admin required", 403);
  const body = keysSchema.parse(await req.json());
  if (!body.secret_key && !body.webhook_secret) {
    return fail("Provide at least one key", 400);
  }
  await saveStripeKeys({
    secret_key: body.secret_key,
    webhook_secret: body.webhook_secret,
  });
  // Verify the secret key actually works with Stripe before reporting success.
  let verified = false;
  try {
    const stripeModule = await import("@/server/stripe");
    await (await stripeModule.getStripe()).balance.retrieve();
    verified = true;
    invalidateStripeCache();
  } catch {
    invalidateStripeCache();
  }
  return ok({ saved: true, verified }, verified ? "Keys saved and verified with Stripe" : "Keys saved but verification failed — check the values");
}, { resource: "settings", action: "manage" });

export const DELETE = apiHandler(async (_req, { user }) => {
  if (!requirePlatform(user?.role)) return fail("Platform admin required", 403);
  await (await import("@/server/repositories")).systemSettings.set("stripe_secret_key", null);
  invalidateStripeCache();
  return ok({ cleared: true }, "Database keys cleared — falling back to environment");
}, { resource: "settings", action: "manage" });
