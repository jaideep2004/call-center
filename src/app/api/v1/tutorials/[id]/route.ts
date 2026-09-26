import { apiHandler, ok, noContent } from "@/server/api-utils";
import { tutorials } from "@/server/repositories";
import { validate, updateTutorialSchema } from "@/server/validate";

export const GET = apiHandler(async (req, context) => {
  const { id } = await context.params;
  const row = await tutorials.findById(id, context.agencyId ?? undefined);
  return ok(row);
}, { resource: "agents", action: "view" });

export const PATCH = apiHandler(async (req, context) => {
  const { id } = await context.params;
  const body = validate(updateTutorialSchema, await req.json());
  const row = await tutorials.update(id, body, context.agencyId!);
  return ok(row);
}, { resource: "agents", action: "manage", allowHead: true });

export const DELETE = apiHandler(async (req, context) => {
  const { id } = await context.params;
  await tutorials.softDelete(id, context.agencyId!);
  return noContent();
}, { resource: "agents", action: "manage", allowHead: true });
