import { publicApiHandler, ok } from "@/server/api-utils";
import { handleRetreaverWebhook } from "@/server/services/retreaver";

export const POST = publicApiHandler(async (req) => {
  const result = await handleRetreaverWebhook(req);
  return ok(result);
});
