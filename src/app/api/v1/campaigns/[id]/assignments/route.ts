import { apiHandler, ok } from "@/server/api-utils";
import { campaignAssignments, agencies, agents } from "@/server/repositories";
import { z } from "zod";
import { validate } from "@/server/validate";

const replaceAssignmentsSchema = z.object({
  agency_ids: z.array(z.string()),
  agent_ids: z.array(z.string()),
});

export const GET = apiHandler(async (_req, context) => {
  const { id } = await context.params;
  const assignments = await campaignAssignments.findForCampaign(id);
  const agencyRows = await agencies.findMany({ pagination: { page: 1, limit: 100 } });
  const agentRows = await agents.findMany({ pagination: { page: 1, limit: 100 } });

  const assignedAgencyIds = assignments.filter((a) => a.agency_id).map((a) => a.agency_id as string);
  const assignedAgentIds = assignments.filter((a) => a.agent_id).map((a) => a.agent_id as string);

  return ok({
    agencies: agencyRows.rows.map((a) => ({ id: a.id, name: a.name })),
    agents: agentRows.rows.map((a) => ({ id: a.id, name: a.user_name ?? a.id.slice(0, 8) })),
    assigned_agency_ids: assignedAgencyIds,
    assigned_agent_ids: assignedAgentIds,
  });
}, { resource: "settings", action: "view" });

export const PUT = apiHandler(async (req, context) => {
  const { id } = await context.params;
  const body = validate(replaceAssignmentsSchema, await req.json());
  await campaignAssignments.replaceForCampaign(id, {
    agencyIds: body.agency_ids,
    agentIds: body.agent_ids,
    assignedBy: context.user?.id,
  });
  return ok({ agency_ids: body.agency_ids, agent_ids: body.agent_ids }, "Assignments saved");
}, { resource: "settings", action: "manage" });
