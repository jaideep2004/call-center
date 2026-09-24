import { apiHandler, ok, fail } from "@/server/api-utils";
import { payments } from "@/server/repositories/payments";
import { agents } from "@/server/repositories";

export const runtime = "nodejs";

/**
 * GET /api/v1/payments — payment history (Stripe top-ups).
 * Admin sees platform-wide rows; heads see their agency; agents see only
 * their own rows. Feeds the admin Payments page (top-payment visibility).
 */
export const GET = apiHandler(async (req, context) => {
  if (context.user?.role === "admin") {
    const url = new URL(req.url);
    const limit = Math.max(1, Math.min(Number(url.searchParams.get("limit") ?? 100) || 100, 500));
    return ok(await payments.listRecent(limit));
  }
  const agencyId = context.agencyId;
  if (!agencyId) return fail("Agency required", 403);
  if (context.isHead) {
    return ok(await payments.findByAgency(agencyId));
  }
  if (context.membership) {
    const me = await agents.findByMembershipId(context.membership.id).catch(() => null);
    if (me) return ok(await payments.findByAgent(me.id));
  }
  return ok(await payments.findByAgency(agencyId));
}, { resource: "wallet", action: "view" });
