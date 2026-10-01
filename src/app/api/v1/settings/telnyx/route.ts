import { apiHandler, ok, fail } from "@/server/api-utils";
import { telnyxPresence, checkTelnyxConnection } from "@/server/services/telnyx";
import { getAppBaseUrl } from "@/server/app-url";

const PLATFORM_ROLES = ["admin"];

function requirePlatform(role?: string): boolean {
  return Boolean(role && PLATFORM_ROLES.includes(role));
}

/**
 * Platform-level Telnyx status. Keys live in env (never in the DB, never
 * returned) — GET reports presence only; POST pings the LIVE Telnyx API so
 * the Settings badge reflects a real connection, not key presence.
 */
export const GET = apiHandler(async (_req, { user }) => {
  if (!requirePlatform(user?.role)) return fail("Platform admin required", 403);
  const details = telnyxPresence();
  return ok({
    configured: details.api_key,
    ...details,
    webhook_url: `${getAppBaseUrl()}/api/telephony/telnyx/webhook`,
  });
}, { resource: "settings", action: "view" });

export const POST = apiHandler(async (_req, { user }) => {
  if (!requirePlatform(user?.role)) return fail("Platform admin required", 403);
  const status = await checkTelnyxConnection();
  if (!status.configured) return fail(status.message, 422);
  if (!status.ok) return fail(`Telnyx verification failed: ${status.message}`, 502);
  return ok(status, `Telnyx verified — API responded in ${status.latency_ms ?? "?"}ms`);
}, { resource: "settings", action: "manage" });
