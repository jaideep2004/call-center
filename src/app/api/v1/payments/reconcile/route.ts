import { apiHandler, ok, fail } from "@/server/api-utils";
import { getStripe } from "@/server/stripe";
import { agents } from "@/server/repositories";
import { creditTopupPayment, findOrCreateTopupPayment } from "@/server/services/payment-credit";
import { z } from "zod";

export const runtime = "nodejs";

const reconcileSchema = z.object({
  session_id: z.string().min(1).max(255),
});

/**
 * POST /api/v1/payments/reconcile — verify a Stripe Checkout session and
 * credit its wallet top-up when the webhook path missed it.
 *
 * Recovery for the Sept-22 $1 case (Stripe paid, app never credited) and the
 * safety net behind every `?payment=success` return: the success page calls
 * this with the `{CHECKOUT_SESSION_ID}` Stripe appends, so the wallet is
 * credited even when the webhook was delayed, misconfigured, or lost.
 *
 * Idempotent: already-completed payments return `{ credited: false }` and
 * the UNIQUE ledger key makes concurrent calls converge on one credit.
 * AuthZ: admins anything; agents only sessions bound to their agent id;
 * heads sessions of their own agency.
 */
export const POST = apiHandler(async (req, context) => {
  const body = reconcileSchema.parse(await req.json());

  const stripe = await getStripe();
  const session = await stripe.checkout.sessions.retrieve(body.session_id);
  if (session.payment_status !== "paid") {
    return fail("Checkout session is not paid yet", 422);
  }
  const meta = { ...((session.metadata ?? {}) as Record<string, string>) };
  if (meta.type === "subscription") {
    return fail("Subscriptions are completed by the webhook", 422);
  }

  if (context.user?.role !== "admin") {
    let myAgentId: string | null = null;
    if (context.membership) {
      const me = await agents.findByMembershipId(context.membership.id).catch(() => null);
      myAgentId = me?.id ?? null;
    }
    const ownsSession = myAgentId != null && meta.agent_id != null && meta.agent_id === myAgentId;
    const headSession = context.isHead && !!context.agencyId && meta.agency_id === context.agencyId;
    if (!ownsSession && !headSession) return fail("Not your payment", 403);
  }

  const found = await findOrCreateTopupPayment({
    id: session.id,
    payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : null,
    metadata: meta,
    amount_total: session.amount_total,
  });
  if (!found) return fail("Session is not a wallet top-up", 422);

  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : "";
  const { credited } = await creditTopupPayment(found.payment, found.kind, paymentIntentId, session.id);
  return ok({
    credited,
    payment_id: found.payment.id,
    amount_cents: found.payment.amount_cents,
    fee_cents: found.payment.fee_cents,
  });
}, { resource: "wallet", action: "recharge" });
