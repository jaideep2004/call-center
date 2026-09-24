import { apiHandler, ok, fail } from "@/server/api-utils";
import { payments } from "@/server/repositories/payments";
import { agents } from "@/server/repositories";

export const runtime = "nodejs";

/**
 * GET /api/v1/payments — payment history (Stripe top-ups).
 * Admin sees platform-wide rows; heads see their agency; agents see only
 * their own rows. Feeds the admin Payments page (top-payment visibility).
 * ?mode=live|test|all filters by Stripe mode (default all; the admin page
 * passes live so test money never mixes into real revenue).
 */
export const GET = apiHandler(async (req, context) => {
  const url = new URL(req.url);
  const modeParam = url.searchParams.get("mode");
  const livemode = modeParam === "live" ? true : modeParam === "test" ? false : undefined;
  if (context.user?.role === "admin") {
    const limit = Math.max(1, Math.min(Number(url.searchParams.get("limit") ?? 100) || 100, 500));
    return ok(await payments.listRecent(limit, livemode));
  }
  const agencyId = context.agencyId;
  if (!agencyId) return fail("Agency required", 403);
  if (context.isHead) {
    return ok(await payments.findByAgency(agencyId, livemode));
  }
  if (context.membership) {
    const me = await agents.findByMembershipId(context.membership.id).catch(() => null);
    if (me) return ok(await payments.findByAgent(me.id, livemode));
  }
  return ok(await payments.findByAgency(agencyId, livemode));
}, { resource: "wallet", action: "view" });
