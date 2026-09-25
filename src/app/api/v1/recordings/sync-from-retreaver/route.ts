import { apiHandler, ok } from "@/server/api-utils";
import { syncRecordingsFromRetreaver } from "@/server/services/retreaver-recordings";

export const runtime = "nodejs";

/**
 * POST /api/v1/recordings/sync-from-retreaver — bridge Retreaver-hosted
 * recording URLs into app.recordings for linked calls missing one.
 * Additive + idempotent: returns how many rows were created.
 */
export const POST = apiHandler(async (_req, context) => {
  const scope = context.user?.role === "admin" ? undefined : (context.agencyId ?? undefined);
  const result = await syncRecordingsFromRetreaver(scope);
  return ok(result, result.synced === 0 ? "Already in sync — nothing new" : `Synced ${result.synced} recording${result.synced === 1 ? "" : "s"} from Retreaver`);
}, { resource: "calls", action: "view" });
