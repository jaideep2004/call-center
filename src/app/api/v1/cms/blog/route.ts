import { okCached, publicApiHandler } from "@/server/api-utils";
import { blogPosts } from "@/server/repositories";

/** Public blog feed: published posts only. Cached 60s at the edge. */
export const GET = publicApiHandler(async (req) => {
  const url = new URL(req.url);
  const category = url.searchParams.get("category") ?? undefined;
  const search = url.searchParams.get("q") ?? undefined;
  const [posts, categories] = await Promise.all([
    blogPosts.findPublished({ category, search }),
    blogPosts.categories(),
  ]);
  const featured = posts.find((p) => p.featured) ?? null;
  return okCached({ posts, featured, categories }, 60, "Blog feed");
});
