import { apiHandler, ok } from "@/server/api-utils";
import { syncRetreaverCalls } from "@/server/services/retreaver";

export const POST = apiHandler(async () => {
  const { stored, skipped, truncated } = await syncRetreaverCalls();
  return ok({ stored, skipped, truncated }, "Retreaver calls synced");
}, { resource: "publishers", action: "manage" });
