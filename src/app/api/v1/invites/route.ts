import { apiHandler, ok, created, fail } from "@/server/api-utils";
import { getAppBaseUrl } from "@/server/app-url";
import { recruitmentInvites } from "@/server/repositories";
import { validate, createInviteSchema } from "@/server/validate";
import { sendEmail } from "@/server/email";
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

  // Env-first: the invite link must point at production even when the admin
  // clicks from localhost or behind a tunnel/proxy.
  const origin = getAppBaseUrl(new URL(req.url).origin);
  const inviteLink = `${origin}/register?invite=${token}`;

  // App invite (not agency-scoped): the invitee joins Coverage Calls, creates
  // their own agency, and adds their team under it.
  await sendEmail({
    to: body.invitee_email,
    subject: EMAIL_SUBJECTS.agencyInvite,
    html: agencyInviteEmail(inviteLink),
  });

  return created(invite, "Invite created");
}, { resource: "agents", action: "manage" });
