import { apiHandler, ok, created, fail } from "@/server/api-utils";
import { blogPosts } from "@/server/repositories";
import { validate, createBlogPostSchema } from "@/server/validate";

export const GET = apiHandler(async () => {
  const { rows } = await blogPosts.findMany({
    pagination: { page: 1, limit: 200 },
    sortBy: "updated_at",
    order: "desc",
  });
  return ok(rows);
}, { resource: "cms", action: "view" });

export const POST = apiHandler(async (req) => {
  const body = validate(createBlogPostSchema, await req.json());
  const existing = await blogPosts.findBySlug(body.slug);
  if (existing) return fail("Slug already exists", 409);
  const row = await blogPosts.createPost({
    ...body,
    published_at: body.published ? new Date().toISOString() : null,
  });
  return created(row, "Blog post created");
}, { resource: "cms", action: "manage" });
