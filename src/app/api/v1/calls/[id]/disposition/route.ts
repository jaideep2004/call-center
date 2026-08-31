import { apiHandler, ok, fail } from "@/server/api-utils";
import { calls, dispositions, agents, leads } from "@/server/repositories";
import { transaction, queryOne } from "@/server/db";
import { validate, createDispositionSchema } from "@/server/validate";
import { isQualifiedOutcome } from "@/server/constants";

export const POST = apiHandler(async (req, { params, membership, agencyId }) => {
  const { id } = await params;
  if (!membership) return fail("Agent membership required", 403);
  const scope = agencyId ?? undefined;
  if (!scope) return fail("Agency scope required", 403);
  const call = await calls.findById(id, scope).catch(() => null);
  if (!call) return fail("Call not found", 404);

  const agent = await agents.findByMembershipId(membership.id);
  if (!agent) return fail("Agent profile not found", 404);
  if (call.agent_id && call.agent_id !== agent.id) return fail("Not your call", 403);

  const existing = await dispositions.findByCallId(call.id);
  if (existing) return fail("Disposition already submitted", 409);

  const body = validate(createDispositionSchema, await req.json());

  const result = await transaction(async (client) => {
    const disposition = (await queryOne(
      `INSERT INTO app.dispositions (call_id, agent_id, outcome, notes, annual_premium_cents)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [call.id, agent.id, body.outcome, body.notes ?? null, body.annual_premium_cents ?? null],
      client,
    ))!;

    let lead = null;
    if (isQualifiedOutcome(body.outcome) && call.from_hash) {
      lead = await leads.createFromCall({
        agencyId: call.agency_id,
        phoneHash: call.from_hash,
        campaignId: call.campaign_id,
        agentId: agent.id,
        outcome: body.outcome,
        callId: call.id,
        actorMembershipId: membership.id,
      }, client);
    }

    return { disposition, lead };
  });

  return ok(result, "Disposition submitted");
}, { resource: "calls", action: "update" });
