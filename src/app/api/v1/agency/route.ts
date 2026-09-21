import { apiHandler, ok, requireHeadOr } from "@/server/api-utils";
import { ForbiddenError } from "@/server/errors";
import { agencies } from "@/server/repositories";
import { validate, updateAgencySchema } from "@/server/validate";

export const GET = apiHandler(async (req, context) => {
  requireHeadOr(context, "agency", "view");
  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? context.agencyId;
  if (!id) return ok(null);
  if (context.isHead && id !== context.agencyId) {
    throw new ForbiddenError("You can only view your own agency");
  }
  const agency = await agencies.findById(id);
  return ok(agency);
}, { resource: "agency", action: "view", allowHead: true });

export const PATCH = apiHandler(async (req, context) => {
  requireHeadOr(context, "agency", "update");
  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? context.agencyId;
  if (!id) return ok(null);
  // Heads are confined to their own agency; platform admins keep cross-agency.
  if (context.isHead && id !== context.agencyId) {
    throw new ForbiddenError("You can only update your own agency");
  }
  const body = validate(updateAgencySchema, await req.json());
  const agency = await agencies.update(id, body);
  return ok(agency, "Agency updated");
}, { resource: "agency", action: "update", allowHead: true });
