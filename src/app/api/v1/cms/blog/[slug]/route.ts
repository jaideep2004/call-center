import { fail, okCached, publicApiHandler } from "@/server/api-utils";
import { blogPosts } from "@/server/repositories";

/** Public single post + related (same category). Drafts 404. */
export const GET = publicApiHandler(async (_req, context) => {
  const { slug } = await context.params;
  const post = await blogPosts.findPublishedBySlug(slug);
  if (!post) return fail("Post not found", 404);
  const related = await blogPosts.related(post, 3);
  return okCached({ post, related }, 60, "Blog post");
});
