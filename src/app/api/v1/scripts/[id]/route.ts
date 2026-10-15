import { apiHandler, ok, noContent } from "@/server/api-utils";
import { scripts } from "@/server/repositories";
import { validate, updateScriptSchema } from "@/server/validate";

export const GET = apiHandler(async (req, context) => {
  const { id } = await context.params;
  const row = await scripts.findByIdInclusive(id, context.agencyId ?? undefined);
  return ok(row);
}, { resource: "agents", action: "view" });

export const PATCH = apiHandler(async (req, context) => {
  const { id } = await context.params;
  const body = validate(updateScriptSchema, await req.json());
  // Inclusive lookup first (global rows belong to no agency); the manage
  // guard above already restricts this to platform admins.
  await scripts.findByIdInclusive(id, context.agencyId ?? undefined);
  const row = await scripts.update(id, body);
  return ok(row, "Script updated");
}, { resource: "agents", action: "manage" });

export const DELETE = apiHandler(async (req, context) => {
  const { id } = await context.params;
  await scripts.findByIdInclusive(id, context.agencyId ?? undefined);
  await scripts.softDelete(id);
  return noContent();
}, { resource: "agents", action: "manage" });
