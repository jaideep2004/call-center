import { apiHandler, ok, fail } from "@/server/api-utils";
import { retreaver } from "@/domain/providers/retreaver";
import { checkRetreaverConnection } from "@/server/services/retreaver";
import { getAppBaseUrl } from "@/server/app-url";

const PLATFORM_ROLES = ["admin"];

function requirePlatform(role?: string): boolean {
  return Boolean(role && PLATFORM_ROLES.includes(role));
}

/**
 * Platform-level Retreaver status. Keys live in env (never in the DB, never
 * returned) — GET reports presence only; POST pings the LIVE Retreaver API
 * so the Settings badge reflects a real connection, not key presence.
 */
export const GET = apiHandler(async (_req, { user }) => {
  if (!requirePlatform(user?.role)) return fail("Platform admin required", 403);
  const configured = retreaver.configured();
  return ok({
    configured,
    api_key: Boolean(process.env.RETREAVER_API_KEY),
    company_id: Boolean(process.env.RETREAVER_COMPANY_ID),
    webhook_secret: Boolean(process.env.RETREAVER_WEBHOOK_SECRET),
    webhook_url: process.env.RETREAVER_WEBHOOK_SECRET
      ? `${getAppBaseUrl()}/api/webhooks/retreaver?token=${encodeURIComponent(process.env.RETREAVER_WEBHOOK_SECRET)}`
      : null,
  });
}, { resource: "settings", action: "view" });

export const POST = apiHandler(async (_req, { user }) => {
  if (!requirePlatform(user?.role)) return fail("Platform admin required", 403);
  const status = await checkRetreaverConnection();
  if (!status.configured) return fail(status.message, 422);
  if (!status.ok) return fail(`Retreaver verification failed: ${status.message}`, 502);
  return ok(status, `Retreaver verified — API responded in ${status.latency_ms ?? "?"}ms`);
}, { resource: "settings", action: "manage" });
