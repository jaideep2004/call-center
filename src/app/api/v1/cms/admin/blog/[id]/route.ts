import { apiHandler, ok, fail, noContent } from "@/server/api-utils";
import { blogPosts } from "@/server/repositories";
import { validate, updateBlogPostSchema } from "@/server/validate";

export const PATCH = apiHandler(async (req, { params }) => {
  const { id } = await params;
  const body = validate(updateBlogPostSchema, await req.json());
  try {
    const row = await blogPosts.updateById(id, {
      ...body,
      ...(body.published === true ? { published_at: new Date().toISOString() } : {}),
      ...(body.published === false ? { published_at: null } : {}),
    });
    return ok(row, "Blog post updated");
  } catch {
    return fail("Blog post not found", 404);
  }
}, { resource: "cms", action: "manage" });

export const DELETE = apiHandler(async (_req, { params }) => {
  const { id } = await params;
  try {
    await blogPosts.softDelete(id);
    return noContent();
  } catch {
    return fail("Blog post not found", 404);
  }
}, { resource: "cms", action: "manage" });
