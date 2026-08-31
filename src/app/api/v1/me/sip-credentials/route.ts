import { apiHandler, ok, fail } from "@/server/api-utils";
import { agents } from "@/server/repositories";

export const GET = apiHandler(async (req, context) => {
  if (!context.membership?.id) {
    return fail("No active membership", 403);
  }
  const agent = await agents.findByMembershipId(context.membership.id);
  if (!agent) return fail("Agent not found", 404);

  const epTypes = (agent.endpoint_types ?? []) as string[];
  if (!epTypes.includes("webrtc")) {
    return fail("Agent not configured for WebRTC", 403);
  }

  const sipUser = process.env.TELNYX_WEBRTC_SIP_USER;
  const sipPassword = process.env.TELNYX_WEBRTC_SIP_PASSWORD;
  const sipRealm = process.env.TELNYX_WEBRTC_SIP_REALM ?? "sip.telnyx.com";

  if (!sipUser || !sipPassword) {
    return fail("WebRTC not configured on server", 500);
  }

  return ok({
    sipUser,
    sipPassword,
    sipRealm,
    connectionId: process.env.TELNYX_WEBRTC_CONNECTION_ID,
  });
});