import { apiHandler, ok, created, fail } from "@/server/api-utils";
import { agents } from "@/server/repositories";
import { query } from "@/server/db";

export const POST = apiHandler(async (req, { user }) => {
  if (!user) return fail("Unauthorized", 401);
  // Never graft a fresh signup into a random agency (the old LIMIT 1 did
  // exactly that — users "belonged" to agencies they never joined and then
  // couldn't create their own). Only ensure an agent profile when the user
  // already holds a membership (invite-accepted, head-created, etc.).
  const mems = await query<{ id: string; agency_id: string }>(
    "SELECT id, agency_id FROM app.memberships WHERE user_id = $1 AND status = 'active' LIMIT 1",
    [user.id],
  );
  if (mems.length === 0) return ok(null, "No agency yet — create one to get started");
  const existingAgent = await agents.findByMembershipId(mems[0].id);
  if (existingAgent) return ok(existingAgent, "Agent already exists");
  const newAgent = await agents.create({
    agency_id: mems[0].agency_id,
    membership_id: mems[0].id,
    endpoint_types: ["webrtc"],
  });
  return created(newAgent, "Agent created");
}, { resource: "agents", action: "update" });
