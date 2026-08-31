import { apiHandler, ok } from "@/server/api-utils";
import { rejectCall } from "@/server/services/call-orchestrator";

export const POST = apiHandler(async (req, context) => {
  const { id } = await context.params;
  const result = await rejectCall(id);
  return ok(result);
}, { resource: "calls", action: "manage" });
