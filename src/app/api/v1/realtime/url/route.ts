import { ok } from "@/server/api-utils";
import { publicApiHandler } from "@/server/api-utils";

export function gatewayPort(): number {
  // Server→gateway publish uses GATEWAY_URL when set — browsers need the
  // SAME port on the page's own host (the gateway normally shares the VPS
  // with the web process on a different port, e.g. :3002).
  try {
    const u = new URL(process.env.GATEWAY_URL ?? "");
    if (u.port) {
      const p = Number(u.port);
      if (Number.isFinite(p) && p > 0) return p;
    }
  } catch { /* fall through to REALTIME_PORT */ }
  const p = Number(process.env.REALTIME_PORT ?? 3001);
  return Number.isFinite(p) && p > 0 ? p : 3001;
}

/**
 * GET /api/v1/realtime/url — public, no secrets. Tells the browser where the
 * realtime gateway actually listens RIGHT NOW. Two modes:
 *
 * - Default: same host as this request + the gateway port (direct connect).
 *   Needs the gateway port reachable from the internet.
 * - `REALTIME_SAME_ORIGIN=1`: the page origin itself (no port). Use with an
 *   nginx `location /socket.io/` proxy to the gateway. Survives firewalls
 *   that only allow 80/443, and can never hit mixed-content blocks. This is
 *   the recommended production setup.
 *
 * Either way the browser learns the URL at runtime with zero client rebuild:
 * NEXT_PUBLIC_REALTIME_URL baked at build time goes stale (the :3001-vs-:3002
 * outage), this never does.
 */
export const GET = publicApiHandler(async (req) => {
  const hostHeader = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const host = hostHeader.split(":")[0] || new URL(req.url).hostname;
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()
    || new URL(req.url).protocol.replace(":", "")
    || "https";
  if (process.env.REALTIME_SAME_ORIGIN === "1") {
    return ok({ url: `${proto}://${host}`, sameOrigin: true });
  }
  return ok({ url: `${proto}://${host}:${gatewayPort()}`, sameOrigin: false });
});
