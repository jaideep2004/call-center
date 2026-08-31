import { apiHandler, ok, created, fail } from "@/server/api-utils";
import { cmsSections } from "@/server/repositories";
import { validate, createCmsSectionSchema, updateCmsSectionSchema } from "@/server/validate";

/**
 * Public CMS feed (lifecycle #21): active sections only, no auth. The
 * homepage renders these instead of hardcoded copy.
 */
export const GET = apiHandler(async () => {
  const rows = await cmsSections.findActive();
  return ok(rows.map((r) => ({ slug: r.slug, title: r.title, content: r.content, updated_at: r.updated_at })));
}, { auth: false });
