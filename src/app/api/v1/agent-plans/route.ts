import { apiHandler, ok, created } from "@/server/api-utils";
import { agentPlans } from "@/server/repositories";
import { validate, createAgentPlanSchema } from "@/server/validate";

export const GET = apiHandler(async (req, context) => {
  const url = new URL(req.url);
  const activeOnly = url.searchParams.get("active") === "true";
  // The buyable catalog is platform-wide: plans are authored once by the
  // admin, but agents from any agency (or no agency yet) must see them.
  // The unfiltered management list stays agency-scoped.
  if (activeOnly) return ok(await agentPlans.findActive());
  const agencyId = context.agencyId;
  if (!agencyId) return ok([]);
  const rows = await agentPlans.findByAgency(agencyId, false);
  return ok(rows);
}, { resource: "agents", action: "view" });

export const POST = apiHandler(async (req, context) => {
  const agencyId = context.agencyId;
  if (!agencyId) return ok([]);
  const body = validate(createAgentPlanSchema, await req.json());
  const row = await agentPlans.create({ agency_id: agencyId, ...body });
  return created(row, "Plan created");
}, { resource: "agents", action: "manage" });
