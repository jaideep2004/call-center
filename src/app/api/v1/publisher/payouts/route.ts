import { apiHandler, ok, fail } from "@/server/api-utils";
import { getPublisherForUser, getPortalPayouts } from "@/server/services/publisher-portal";

export const GET = apiHandler(async (_req, { user }) => {
  if (!user) return fail("Authentication required", 401);
  const publisher = await getPublisherForUser(user.id);
  if (!publisher) return fail("Publisher account not found", 404);
  const payouts = await getPortalPayouts(publisher.id);
  return ok(payouts);
}, { resource: "publisher-portal", action: "view" });
