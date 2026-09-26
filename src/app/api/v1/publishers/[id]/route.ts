import { apiHandler, ok, noContent, fail } from "@/server/api-utils";
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
  if (body.email) {
    const dupe = await publishers.findByEmail(body.email);
    if (dupe && dupe.id !== id) return fail("A publisher with this email already exists", 409);
  }
  try {
    const row = await publishers.update(id, {
      ...body,
      email: body.email || null,
      afid: body.afid || null,
    });
    return ok(row, "Publisher updated");
  } catch (e) {
    if ((e as { code?: string })?.code === "23505") {
      return fail("A publisher with this email already exists", 409);
    }
    throw e;
  }
}, { resource: "publishers", action: "manage" });

export const DELETE = apiHandler(async (req, { params }) => {
  const { id } = await params;
  await publishers.softDelete(id);
  return noContent();
}, { resource: "publishers", action: "manage" });
