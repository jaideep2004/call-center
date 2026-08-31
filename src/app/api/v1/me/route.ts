import { apiHandler, ok } from "@/server/api-utils";
import { agents } from "@/server/repositories";

export const GET = apiHandler(async (req, context) => {
  let agentId: string | null = null;
  if (context.membership?.id) {
    const agent = await agents.findByMembershipId(context.membership.id);
    agentId = agent?.id ?? null;
  }
  return ok({
    user: context.user,
    membership: context.membership,
    agencyId: context.agencyId,
    agentId,
  });
});
