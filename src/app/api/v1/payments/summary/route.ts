import { apiHandler, ok, fail } from "@/server/api-utils";
import { payments } from "@/server/repositories/payments";
import { agents } from "@/server/repositories";

/**
 * GET /api/v1/payments/summary — live-money totals for the Collected card.
 * Always completed + livemode (real cs_live_* charges): test-mode payments
 * never mix in, regardless of the history table's live/test/all filter.
 * Same visibility scope as the list endpoint (admin platform-wide,
 * head agency-wide, agent own rows).
 */
export const GET = apiHandler(async (_req, context) => {
  if (context.user?.role === "admin") {
    return ok(await payments.summarizeLiveCompleted());
  }
  const agencyId = context.agencyId;
  if (!agencyId) return fail("Agency required", 403);
  if (context.isHead) {
    return ok(await payments.summarizeLiveCompleted({ agencyId }));
  }
  if (context.membership) {
    const me = await agents.findByMembershipId(context.membership.id).catch(() => null);
    if (me) return ok(await payments.summarizeLiveCompleted({ agentId: me.id }));
  }
  return fail("Agent profile not found", 403);
}, { resource: "wallet", action: "view" });
