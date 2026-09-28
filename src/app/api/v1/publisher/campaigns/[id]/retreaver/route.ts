import { apiHandler, ok, fail } from "@/server/api-utils";
import { getPublisherForUser, getPublisherCampaignRetreaverLink } from "@/server/services/publisher-portal";

/**
 * GET /api/v1/publisher/campaigns/[id]/retreaver — the Retreaver-side
 * connection details for one assigned campaign: the Retreaver DID carrying
 * this publisher's afid plus the rtb.retreaver.com ping block (endpoint,
 * publisher_id, key) for publishers running their own tracking.
 * Publishers only ever see their own rows.
 */
export const GET = apiHandler(async (_req, { params, user }) => {
  if (!user) return fail("Authentication required", 401);
  const publisher = await getPublisherForUser(user.id);
  if (!publisher) return fail("Publisher account not found", 404);
  const { id } = await params;
  return ok(await getPublisherCampaignRetreaverLink(publisher.id, id));
}, { resource: "publisher-portal", action: "view" });
