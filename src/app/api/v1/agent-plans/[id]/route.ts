import { apiHandler, ok, noContent } from "@/server/api-utils";
import { agentPlans } from "@/server/repositories";
import { validate, updateAgentPlanSchema } from "@/server/validate";

export const GET = apiHandler(async (req, { params, agencyId }) => {
  const { id } = await params;
  const plan = await agentPlans.findById(id, agencyId ?? undefined);
  return ok(plan);
}, { resource: "agents", action: "view" });

export const PUT = apiHandler(async (req, { params, agencyId }) => {
  const { id } = await params;
  const body = validate(updateAgentPlanSchema, await req.json());
  const plan = await agentPlans.update(id, body, agencyId ?? undefined);
  return ok(plan, "Plan updated");
}, { resource: "agents", action: "manage" });

export const DELETE = apiHandler(async (req, { params, agencyId }) => {
  const { id } = await params;
  await agentPlans.update(id, { active: false }, agencyId ?? undefined);
  return noContent();
}, { resource: "agents", action: "manage" });
