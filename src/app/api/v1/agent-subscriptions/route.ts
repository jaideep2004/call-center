import { apiHandler, ok, created, fail } from "@/server/api-utils";
import { agentSubscriptions, agentPlans, agents } from "@/server/repositories";
import { validate, createAgentSubscriptionSchema } from "@/server/validate";

export const GET = apiHandler(async (req, context) => {
  const url = new URL(req.url);
  let agentId = url.searchParams.get("agent_id") || "";
  // Plain agents see ONLY their own subscriptions — the query param is never
  // trusted for them. Heads/admins keep the team view.
  if (context.user?.role !== "admin" && !context.isHead) {
    const me = context.membership ? await agents.findByMembershipId(context.membership.id).catch(() => null) : null;
    if (!me) return fail("Agent profile not found", 403);
    agentId = me.id;
  }
  if (!agentId) return ok([]);
  const rows = await agentSubscriptions.findByAgent(agentId);
  return ok(rows);
}, { resource: "agents", action: "view" });

export const POST = apiHandler(async (req, { membership, user }) => {
  const body = validate(createAgentSubscriptionSchema, await req.json());

  const plan = await agentPlans.findById(body.plan_id).catch(() => null);
  if (!plan) return fail("Plan not found", 404);
  // Plans are a shared platform catalog (any agency's agent may buy any
  // active plan) — gate on active, not on same-agency.
  if (!plan.active) return fail("Plan is no longer available", 400);
  // This is the $0-plan path (the UI only offers it for free plans) — paid
  // plans must go through Stripe checkout, never a direct insert.
  if (plan.price_cents !== 0) return fail("Paid plans require checkout", 402);

  // Buyer resolution: membership agents use their membership profile, but a
  // fresh signup has no membership yet — fall back to the login-keyed
  // profile (created on demand). The row is adopted into the agency later,
  // so the subscription survives the join.
  let agent = membership
    ? await agents.findByMembershipId(membership.id).catch(() => null)
    : null;
  if (!agent && user) {
    agent = await agents.findByUserId(user.id);
    if (!agent) {
      agent = await agents.create({
        agency_id: null,
        membership_id: null,
        user_id: user.id,
        endpoint_types: ["webrtc"],
      });
    }
  }
  if (!agent) return fail("Agent profile not found", 404);

  const existing = await agentSubscriptions.findActiveByAgent(agent.id);
  if (existing) return fail("Already has an active subscription", 409);

  const sub = await agentSubscriptions.create({
    agent_id: agent.id,
    plan_id: plan.id,
    auto_renew: body.auto_renew ?? false,
  });
  return created(sub, "Subscribed");
}, { resource: "agents", action: "update", allowHead: true });
