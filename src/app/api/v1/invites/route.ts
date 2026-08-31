import { apiHandler, ok, created, fail } from "@/server/api-utils";
import { recruitmentInvites, agencies, memberships } from "@/server/repositories";
import { validate, createInviteSchema } from "@/server/validate";
import { sendEmail, smtpConfigured } from "@/server/email";
import { EMAIL_SUBJECTS, agencyInviteEmail } from "@/server/email-templates";
import crypto from "node:crypto";

export const GET = apiHandler(async (req, { membership }) => {
  if (!membership) return ok([]);
  const invites = await recruitmentInvites.findByInviter(membership.id);
  return ok(invites);
}, { resource: "agents", action: "view" });

export const POST = apiHandler(async (req, { membership, agencyId }) => {
  if (!membership) return fail("Membership required", 403);
  if (!agencyId) return fail("Agency not found", 404);
  const body = validate(createInviteSchema, await req.json());

  const token = crypto.randomBytes(24).toString("hex");
  const invite = await recruitmentInvites.create({
    inviter_membership_id: membership.id,
    invitee_email: body.invitee_email,
    token,
    sub_agency_id: null,
  });

  const origin = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const inviteLink = `${origin}/register?invite=${token}`;

  const agency = await agencies.findById(membership.agency_id).catch(() => null);

  await sendEmail({
    to: body.invitee_email,
    subject: EMAIL_SUBJECTS.agencyInvite,
    html: agencyInviteEmail(inviteLink, agency?.name),
  });

  return created(invite, "Invite created");
}, { resource: "agents", action: "manage" });
