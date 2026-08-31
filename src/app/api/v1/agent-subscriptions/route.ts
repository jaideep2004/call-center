import { apiHandler, ok, created, fail } from "@/server/api-utils";
import { agentSubscriptions, agentPlans, agents } from "@/server/repositories";
import { validate, createAgentSubscriptionSchema } from "@/server/validate";

export const GET = apiHandler(async (req, context) => {
  const url = new URL(req.url);
  const agentId = url.searchParams.get("agent_id") || "";
  if (!agentId) return ok([]);
  const rows = await agentSubscriptions.findByAgent(agentId);
  return ok(rows);
}, { resource: "agents", action: "view" });

export const POST = apiHandler(async (req, { membership, agencyId }) => {
  if (!membership) return fail("Agent membership required", 403);
  const body = validate(createAgentSubscriptionSchema, await req.json());

  const plan = await agentPlans.findById(body.plan_id).catch(() => null);
  if (!plan) return fail("Plan not found", 404);
  if (plan.agency_id !== agencyId) return fail("Plan not available", 403);

  const agent = await agents.findByMembershipId(membership.id);
  if (!agent) return fail("Agent profile not found", 404);

  const existing = await agentSubscriptions.findActiveByAgent(agent.id);
  if (existing) return fail("Already has an active subscription", 409);

  const sub = await agentSubscriptions.create({
    agent_id: agent.id,
    plan_id: plan.id,
    auto_renew: body.auto_renew ?? false,
  });
  return created(sub, "Subscribed");
}, { resource: "agents", action: "manage" });
