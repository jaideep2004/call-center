import { apiHandler, ok, fail } from "@/server/api-utils";
import { getStripe } from "@/server/stripe";
import { payments } from "@/server/repositories/payments";
import { agents } from "@/server/repositories";
import { z } from "zod";

const checkoutSchema = z.object({
  amount_cents: z.number().int().min(100).max(1000000),
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
});

/**
 * Agent wallet top-up via Stripe Checkout. The wallet credit happens ONLY in
 * the stripe webhook (idempotent by session id) — this route creates no
 * ledger entries, so there is no self-mint vector.
 */
export const POST = apiHandler(async (req, { membership, agencyId }) => {
  if (!membership) return fail("Agent membership required", 403);
  if (!agencyId) return fail("Agency required", 403);
  const body = checkoutSchema.parse(await req.json());

  const agent = await agents.findByMembershipId(membership.id);
  if (!agent) return fail("Agent profile not found", 404);

  const origin = new URL(req.url).origin;
  const successUrl = body.success_url || `${origin}/dashboard/wallet/agent?payment=success`;
  const cancelUrl = body.cancel_url || `${origin}/dashboard/wallet/agent?payment=cancelled`;

  const session = await (await getStripe()).checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: { name: "Agent Wallet Top-Up" },
        unit_amount: body.amount_cents,
      },
      quantity: 1,
    }],
    client_reference_id: agent.id,
    metadata: { type: "agent_wallet_topup", agent_id: agent.id, agency_id: agencyId },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  await payments.create({
    agency_id: agencyId,
    agent_id: agent.id,
    stripe_session_id: session.id,
    amount_cents: body.amount_cents,
  });

  return ok({ url: session.url, sessionId: session.id });
}, { resource: "wallet", action: "recharge" });
