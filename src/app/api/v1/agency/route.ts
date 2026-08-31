import { apiHandler, ok } from "@/server/api-utils";
import { agencies } from "@/server/repositories";
import { validate, updateAgencySchema } from "@/server/validate";

export const GET = apiHandler(async (req, context) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? context.agencyId;
  if (!id) return ok(null);
  const agency = await agencies.findById(id);
  return ok(agency);
}, { resource: "agency", action: "view" });

export const PATCH = apiHandler(async (req, context) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? context.agencyId;
  if (!id) return ok(null);
  const body = validate(updateAgencySchema, await req.json());
  const agency = await agencies.update(id, body);
  return ok(agency, "Agency updated");
}, { resource: "agency", action: "update" });
