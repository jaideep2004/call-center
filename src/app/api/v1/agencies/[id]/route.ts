import { apiHandler, ok, fail, noContent } from "@/server/api-utils";
import { agencies } from "@/server/repositories";
import { validate, updateAgencySchema } from "@/server/validate";

export const runtime = "nodejs";

export const GET = apiHandler(async (_req, { params }) => {
  const { id } = await params;
  try {
    const row = await agencies.findById(id);
    return ok(row);
  } catch {
    return fail("Agency not found", 404);
  }
}, { resource: "agency", action: "view" });

export const PATCH = apiHandler(async (req, { params }) => {
  const { id } = await params;
  const body = validate(updateAgencySchema, await req.json());
  try {
    const existing = await agencies.findById(id);
    if (!existing) return fail("Agency not found", 404);
    // slug uniqueness check
    if (body.slug && body.slug !== existing.slug) {
      const dup = await agencies.findBySlug(body.slug).catch(() => null);
      if (dup) return fail("An agency with this slug already exists", 409);
    }
    const updated = await agencies.update(id, body as any);
    return ok(updated, "Agency updated");
  } catch (e: any) {
    if (e?.message?.includes("not found")) return fail("Agency not found", 404);
    throw e;
  }
}, { resource: "agency", action: "manage" });

export const DELETE = apiHandler(async (_req, { params }) => {
  const { id } = await params;
  try {
    await agencies.findById(id);
    await agencies.softDelete(id);
    return noContent();
  } catch {
    return fail("Agency not found", 404);
  }
}, { resource: "agency", action: "manage" });
