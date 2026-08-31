import { apiHandler, ok, created } from "@/server/api-utils";
import { agentPlans } from "@/server/repositories";
import { validate, createAgentPlanSchema } from "@/server/validate";

export const GET = apiHandler(async (req, context) => {
  const agencyId = context.agencyId;
  if (!agencyId) return ok([]);
  const url = new URL(req.url);
  const activeOnly = url.searchParams.get("active") === "true";
  const rows = await agentPlans.findByAgency(agencyId, activeOnly);
  return ok(rows);
}, { resource: "agents", action: "view" });

export const POST = apiHandler(async (req, context) => {
  const agencyId = context.agencyId;
  if (!agencyId) return ok([]);
  const body = validate(createAgentPlanSchema, await req.json());
  const row = await agentPlans.create({ agency_id: agencyId, ...body });
  return created(row, "Plan created");
}, { resource: "agents", action: "manage" });
