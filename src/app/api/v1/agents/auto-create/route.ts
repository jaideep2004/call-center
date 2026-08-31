import { apiHandler, ok, created, fail } from "@/server/api-utils";
import { agents, memberships } from "@/server/repositories";
import { query } from "@/server/db";

export const POST = apiHandler(async (req, { user }) => {
  if (!user) return fail("Unauthorized", 401);
  const agencies = await query<{ id: string }>("SELECT id FROM app.agencies LIMIT 1");
  if (agencies.length === 0) return fail("No agency found", 404);

  const agencyId = agencies[0].id;

  const existingMem = await memberships.findByUserAndAgency(user.id, agencyId);
  if (existingMem) {
    const existingAgent = await agents.findByMembershipId(existingMem.id);
    if (existingAgent) return ok(existingAgent, "Agent already exists");
    const newAgent = await agents.create({
      agency_id: agencyId,
      membership_id: existingMem.id,
      endpoint_types: ["webrtc"],
    });
    return created(newAgent, "Agent created");
  }

  const membership = await memberships.create({ agency_id: agencyId, user_id: user.id, role: "agent" });
  const agent = await agents.create({
    agency_id: agencyId,
    membership_id: membership.id,
    endpoint_types: ["webrtc"],
  });
  return created(agent, "Agent created");
}, { resource: "agents", action: "create" });
