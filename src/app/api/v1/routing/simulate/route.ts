import { apiHandler, ok, created, fail } from "@/server/api-utils";
import { processProviderEvent } from "@/server/services/call-orchestrator";
import { phoneNumbers } from "@/server/repositories";
import { validate, routingSimulateSchema } from "@/server/validate";

export const runtime = "nodejs";

export const POST = apiHandler(async (req) => {
  const body = validate(routingSimulateSchema, await req.json());

  // The simulator must dial a REAL provisioned DID: the old hardcoded
  // +15559876543 exists nowhere, so every simulation 500d on the unknown-DID
  // guard. Prefer the requested campaign's number, else any live one.
  let to: string | null = null;
  if (body.campaign_id) {
    to = (await phoneNumbers.findByCampaign(body.campaign_id).catch(() => null))?.e164 ?? null;
    if (!to) return fail("Campaign has no active tracking number — add one before simulating", 422);
  } else {
    to = (await phoneNumbers.findFirstRoutable().catch(() => null))?.e164 ?? null;
    if (!to) return fail("No active tracking numbers provisioned — add one to a campaign first", 422);
  }

  const mockEvent = {
    provider: "mock",
    eventId: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: "inbound" as const,
    providerCallId: `call_sim_${Date.now()}`,
    occurredAt: new Date().toISOString(),
    from: body.from ?? "+15551234567",
    to,
    raw: {},
  };

  const result = await processProviderEvent(mockEvent);
  return created(result);
  // NOTE: gated as update (not create) so agents can use the simulator.
  // Granting agents calls:create would also unlock POST /calls fabrication —
  // strictly wider than this dry-run tool needs.
}, { resource: "calls", action: "update" });
