import { apiHandler, ok, created } from "@/server/api-utils";
import { processProviderEvent } from "@/server/services/call-orchestrator";
import { validate, routingSimulateSchema } from "@/server/validate";

export const runtime = "nodejs";

export const POST = apiHandler(async (req) => {
  const body = validate(routingSimulateSchema, await req.json());

  const mockEvent = {
    provider: "mock",
    eventId: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: "inbound" as const,
    providerCallId: `call_sim_${Date.now()}`,
    occurredAt: new Date().toISOString(),
    from: body.from ?? "+15551234567",
    to: "+15559876543",
    raw: {},
  };

  const result = await processProviderEvent(mockEvent);
  return created(result);
}, { resource: "calls", action: "create" });
