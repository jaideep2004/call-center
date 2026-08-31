import { apiHandler, ok, noContent } from "@/server/api-utils";
import { scripts } from "@/server/repositories";
import { validate, updateScriptSchema } from "@/server/validate";

export const GET = apiHandler(async (req, context) => {
  const { id } = await context.params;
  const row = await scripts.findById(id, context.agencyId ?? undefined);
  return ok(row);
}, { resource: "agents", action: "view" });

export const PATCH = apiHandler(async (req, context) => {
  const { id } = await context.params;
  const body = validate(updateScriptSchema, await req.json());
  const row = await scripts.update(id, body, context.agencyId!);
  return ok(row);
}, { resource: "agents", action: "manage" });

export const DELETE = apiHandler(async (req, context) => {
  const { id } = await context.params;
  await scripts.softDelete(id, context.agencyId!);
  return noContent();
}, { resource: "agents", action: "manage" });
