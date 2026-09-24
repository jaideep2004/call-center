import { apiHandler, ok, created, fail } from "@/server/api-utils";
import { getAppBaseUrl } from "@/server/app-url";
import { recruitmentInvites, agencies } from "@/server/repositories";
import { validate, createInviteSchema } from "@/server/validate";
import { sendEmail } from "@/server/email";
import { EMAIL_SUBJECTS, agencyInviteEmail } from "@/server/email-templates";
import crypto from "node:crypto";

export const GET = apiHandler(async (req, { membership }) => {
  if (!membership) return ok([]);
  const invites = await recruitmentInvites.findByInviter(membership.id);
  return ok(invites);
}, { resource: "agents", action: "view" });

export const POST = apiHandler(async (req, { membership, agencyId, user }) => {
  if (!membership) return fail("Membership required", 403);
  if (!agencyId) return fail("Agency not found", 404);
  const body = validate(createInviteSchema, await req.json());

  // Admin may invite into a specific agency (agency detail page). The agency
  // must exist; everyone else always invites into their own agency.
  let targetAgencyId = agencyId;
  if (body.agency_id && body.agency_id !== agencyId) {
    if (user?.role !== "admin") return fail("Only platform admins can invite into another agency", 403);
    const target = await agencies.findById(body.agency_id).catch(() => null);
    if (!target) return fail("Target agency not found", 404);
    targetAgencyId = target.id;
  }

  const token = crypto.randomBytes(24).toString("hex");
  const invite = await recruitmentInvites.create({
    inviter_membership_id: membership.id,
    invitee_email: body.invitee_email,
    token,
    sub_agency_id: null,
    agency_id: targetAgencyId,
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
