import { apiHandler, ok, fail } from "@/server/api-utils";
import { getStripe } from "@/server/stripe";
import { agentPlans, agents } from "@/server/repositories";
import { payments } from "@/server/repositories/payments";
import { z } from "zod";

const checkoutSchema = z.object({
  plan_id: z.string().uuid(),
});

export const runtime = "nodejs";

export const POST = apiHandler(async (req, { membership, agencyId }) => {
  if (!membership) return fail("Agent membership required", 403);
  if (!agencyId) return fail("Agency not found", 404);

  const body = checkoutSchema.parse(await req.json());

  const plan = await agentPlans.findById(body.plan_id).catch(() => null);
  if (!plan) return fail("Plan not found", 404);
  if (plan.agency_id !== agencyId) return fail("Plan not available", 403);
  if (!plan.active) return fail("Plan is no longer available", 400);

  const agent = await agents.findByMembershipId(membership.id);
  if (!agent) return fail("Agent profile not found", 404);

  const origin = new URL(req.url).origin;
  const successUrl = `${origin}/dashboard/agents/subscription?subscribe=success`;
  const cancelUrl = `${origin}/dashboard/agents/subscription?subscribe=cancelled`;

  const session = await (await getStripe()).checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: { name: plan.name },
        unit_amount: plan.price_cents,
      },
      quantity: 1,
    }],
    client_reference_id: agencyId,
    metadata: {
      type: "subscription",
      agent_id: agent.id,
      plan_id: plan.id,
      agency_id: agencyId,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  await payments.create({
    agency_id: agencyId,
    agent_id: agent.id,
    plan_id: plan.id,
    stripe_session_id: session.id,
    amount_cents: plan.price_cents,
  });

  return ok({ url: session.url, sessionId: session.id });
}, { resource: "wallet", action: "recharge" });
