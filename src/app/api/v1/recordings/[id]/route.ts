import { apiHandler, ok } from "@/server/api-utils";
import { recordings } from "@/server/repositories";

export const GET = apiHandler(async (req, context) => {
  const { id } = await context.params;
  const recording = await recordings.findById(id, context.agencyId ?? undefined);
  return ok(recording);
}, { resource: "calls", action: "view" });

export const DELETE = apiHandler(async (req, context) => {
  const { id } = await context.params;
  await recordings.delete(id, context.agencyId!);
  return ok(null, "Recording deleted");
}, { resource: "calls", action: "manage" });
