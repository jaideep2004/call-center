import { apiHandler, ok } from "@/server/api-utils";
import { checkRetreaverConnection } from "@/server/services/retreaver";

export const GET = apiHandler(async () => {
  const status = await checkRetreaverConnection();
  return ok(status, status.ok ? "Retreaver connected" : "Retreaver connection failed");
}, { resource: "publishers", action: "view" });
