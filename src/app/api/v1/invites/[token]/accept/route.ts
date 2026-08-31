import { apiHandler, ok, fail } from "@/server/api-utils";
import { recruitmentInvites, memberships, agents } from "@/server/repositories";
import { acceptPortalInvite } from "@/server/services/publisher-portal";

export const POST = apiHandler(async (req, { params, user }) => {
  const { token } = await params;
  if (!user) return fail("Authentication required", 401);

  const invite = await recruitmentInvites.findByToken(token);
  if (!invite) {
    const publisherResult = await acceptPortalInvite(token, user.id);
    return ok(publisherResult, "Publisher portal activated");
  }
  if (invite.status !== "pending") return fail("Invite already used", 410);
  if (new Date(invite.expires_at) < new Date()) return fail("Invite expired", 410);

  const inviterMembership = await memberships.findById(invite.inviter_membership_id);
  if (!inviterMembership) return fail("Inviter not found", 404);

  const existingMember = await memberships.findByUserAndAgency(user.id, inviterMembership.agency_id);
  if (existingMember) return fail("Already a member of this agency", 409);

  const newMembership = await memberships.create({
    agency_id: inviterMembership.agency_id,
    user_id: user.id,
    role: "agent",
  });

  if (invite.sub_agency_id) {
    await memberships.create({
      agency_id: invite.sub_agency_id,
      user_id: user.id,
      role: "agent",
    });
  }

  const newAgent = await agents.create({
    agency_id: inviterMembership.agency_id,
    membership_id: newMembership.id,
  });

  await recruitmentInvites.accept(token);

  return ok({ membership: newMembership, agent: newAgent }, "Invite accepted");
});
