import { apiHandler, ok, fail } from "@/server/api-utils";
import { getPublisherForUser, getPortalCalls } from "@/server/services/publisher-portal";

export const GET = apiHandler(async (req, { user }) => {
  if (!user) return fail("Authentication required", 401);
  const publisher = await getPublisherForUser(user.id);
  if (!publisher) return fail("Publisher account not found", 404);

  const url = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "25", 10), 1), 100);
  const page = Math.max(parseInt(url.searchParams.get("page") ?? "1", 10), 1);

  const result = await getPortalCalls(publisher.id, limit, (page - 1) * limit);
  return ok(result);
}, { resource: "publisher-portal", action: "view" });
