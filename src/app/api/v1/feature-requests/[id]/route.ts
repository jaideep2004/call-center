import { apiHandler, ok } from "@/server/api-utils";
import { requirePermission } from "@/server/api-utils";
import { featureRequests } from "@/server/repositories";
import { validate, updateFeatureRequestSchema } from "@/server/validate";

export const PATCH = apiHandler(async (req, context) => {
  const { id } = await context.params;
  const body = validate(updateFeatureRequestSchema, await req.json());

  if (body.vote === true) {
    const row = await featureRequests.incrementVotes(id);
    return ok(row, "Vote recorded");
  }

  if (body.status) {
    requirePermission(context.user?.role, "features", "manage");
    const row = await featureRequests.update(id, { status: body.status });
    return ok(row, "Status updated");
  }

  const row = await featureRequests.findById(id);
  return ok(row);
}, { resource: "features", action: "create" });
