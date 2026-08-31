import { apiHandler, ok, noContent } from "@/server/api-utils";
import { publishers } from "@/server/repositories";
import { validate, updatePublisherSchema } from "@/server/validate";
import { setPublisherStatus } from "@/server/services/retreaver";

export const PATCH = apiHandler(async (req, { params }) => {
  const { id } = await params;
  const body = validate(updatePublisherSchema, await req.json());
  if (body.retreaver_status) {
    const row = await setPublisherStatus(id, body.retreaver_status);
    return ok(row, "Publisher updated");
  }
  const row = await publishers.update(id, {
    ...body,
    email: body.email || null,
    afid: body.afid || null,
  });
  return ok(row, "Publisher updated");
}, { resource: "publishers", action: "manage" });

export const DELETE = apiHandler(async (req, { params }) => {
  const { id } = await params;
  await publishers.softDelete(id);
  return noContent();
}, { resource: "publishers", action: "manage" });
