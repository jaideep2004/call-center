import { apiHandler, ok, created, fail, noContent } from "@/server/api-utils";
import { cmsSections } from "@/server/repositories";
import { validate, createCmsSectionSchema, updateCmsSectionSchema } from "@/server/validate";

export const GET = apiHandler(async () => {
  const rows = await cmsSections.findAll();
  return ok(rows);
}, { resource: "cms", action: "view" });

export const POST = apiHandler(async (req, { membership }) => {
  const body = validate(createCmsSectionSchema, await req.json());
  const existing = await cmsSections.findBySlug(body.slug);
  if (existing) return fail("Slug already exists", 409);
  const row = await cmsSections.create({
    slug: body.slug,
    title: body.title,
    content: body.content,
    updated_by: membership?.id ?? null,
  });
  return created(row, "Section created");
}, { resource: "cms", action: "manage" });

export const PATCH = apiHandler(async (req, { membership }) => {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  if (!slug) return fail("slug query param required", 400);
  const body = validate(updateCmsSectionSchema, await req.json());
  const row = await cmsSections.update(slug, {
    title: body.title,
    content: body.content,
    active: body.active,
    updated_by: membership?.id ?? null,
  });
  if (!row) return fail("Section not found", 404);
  return ok(row, "Section updated");
}, { resource: "cms", action: "manage" });

export const DELETE = apiHandler(async (req) => {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  if (!slug) return fail("slug query param required", 400);
  const existing = await cmsSections.findBySlug(slug);
  if (!existing) return fail("Section not found", 404);
  await cmsSections.update(slug, { active: false });
  return noContent();
}, { resource: "cms", action: "manage" });
