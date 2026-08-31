import { apiHandler, ok, fail } from "@/server/api-utils";
import { getPublisherForUser, getPortalOverview } from "@/server/services/publisher-portal";

export const GET = apiHandler(async (_req, { user }) => {
  if (!user) return fail("Authentication required", 401);
  const publisher = await getPublisherForUser(user.id);
  if (!publisher) return fail("Publisher account not found", 404);
  const overview = await getPortalOverview(publisher.id);
  return ok(overview);
}, { resource: "publisher-portal", action: "view" });
