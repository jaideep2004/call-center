import { apiHandler, ok, created, fail } from "@/server/api-utils";
import { agencies, agents, systemSettings, recruitmentInvites } from "@/server/repositories";
import { validate, createAgencySchema } from "@/server/validate";
import { transaction, query } from "@/server/db";
import { getAppBaseUrl } from "@/server/app-url";
import { sendEmail } from "@/server/email";
import { EMAIL_SUBJECTS, agencyInviteEmail } from "@/server/email-templates";
import crypto from "node:crypto";

export const runtime = "nodejs";

export const GET = apiHandler(async (_req, context) => {
  const { rows } = await agencies.findMany({ pagination: { page: 1, limit: 100 } });
  return ok(rows);
}, { resource: "agency", action: "view" });

export const POST = apiHandler(async (req, context) => {
  const body = validate(createAgencySchema, await req.json());
  const isAgent = context.user?.role === "agent";

  if (isAgent) {
    const allowed = await systemSettings.getBoolean("allow_agent_agency_creation");
    if (!allowed) {
      return fail("Agency creation is disabled by the platform admin", 403);
    }
    // Registration approval first: pending agents may not create agencies.
    // Identity is the membership agent row, else the pending signup row.
    let approverAgent = context.membership
      ? await agents.findByMembershipId(context.membership.id).catch(() => null)
      : null;
    if (!approverAgent && context.user) {
      approverAgent = await agents.findByUserId(context.user.id).catch(() => null);
    }
    if (!approverAgent || approverAgent.approval_status !== "approved") {
      return fail("Your registration is pending approval — you can create an agency once approved", 403);
    }
    if (context.agencyId && context.membership) {
      // Phase 3 (point 6): the old guard ("already belong") made agent
      // agency-creation 100% dead — resolveAuth derives membership AND
      // agencyId from the same active row, so the pass path was unreachable.
      // Explicit leave-and-create only; never silent. Heads cannot strand
      // their agency without transferring headship first.
      if (body.leaveAgency !== true) {
        return fail("You already belong to an agency — confirm leaving it to create a new one (LEAVE_REQUIRED)", 400);
      }
      const headRows = await query<{ one: number }>(
        `SELECT 1 AS one FROM app.agencies WHERE id = $1 AND head_membership_id = $2`,
        [context.agencyId, context.membership.id],
      );
      if (headRows.length > 0) {
        return fail("You head your current agency — transfer headship before leaving", 400);
      }
    }
  }

  // Head membership for invite attribution (creator's own membership when
  // they have one — agents creating their own agency, or the admin's).
  let headMembershipId: string | null = context.membership?.id ?? null;

  const agency = await transaction(async (client) => {
    const agencyRow = await agencies.create({
      name: body.name,
      slug: body.slug,
    }, client);    // Every head needs an agent row too — otherwise they never appear in the
    // agents list and can never take calls (the old flow created memberships
    // only, stranding fresh heads).
    const ensureAgentRow = async (membershipId: string) => {
      const existing = await client.query("SELECT id FROM app.agents WHERE membership_id = $1", [membershipId]);
      if (existing.rows.length > 0) return;
      // Adopt a pending signup row (keyed by login) instead of stranding a duplicate.
      const adopted = await client.query(
        `UPDATE app.agents SET agency_id = $1, membership_id = $2 WHERE user_id = $3 AND membership_id IS NULL RETURNING id`,
        [agencyRow.id, membershipId, context.user!.id],
      );
      if (adopted.rows.length === 0) {
        await client.query(
          `INSERT INTO app.agents (agency_id, membership_id, user_id, endpoint_types, display_code)
           VALUES ($1, $2, $3, '{webrtc}', 'AG-' || LPAD(nextval('app.agent_code_seq')::text, 4, '0'))`,
          [agencyRow.id, membershipId, context.user!.id],
        );
      }
    };
    if (isAgent && context.membership) {
      await client.query(
        `UPDATE app.agencies SET head_membership_id = $1 WHERE id = $2`,
        [context.membership.id, agencyRow.id],
      );
      await client.query(
        `UPDATE app.memberships SET agency_id = $1, role = 'agent', status = 'active' WHERE id = $2`,
        [agencyRow.id, context.membership.id],
      );
      // The agent row MUST follow the membership: every scoped lookup
      // (agent detail, take-calls readiness, routing) filters agents by
      // agency_id. Without this the agent keeps the OLD agency, their own
      // detail 404s, and take-calls sticks on "Loading approval" forever.
      await client.query(
        `UPDATE app.agents SET agency_id = $1 WHERE membership_id = $2`,
        [agencyRow.id, context.membership.id],
      );
      await client.query(`UPDATE "user" SET role = 'agent' WHERE id = $1`, [context.user!.id]);
      await ensureAgentRow(context.membership.id);
      headMembershipId = context.membership.id;
    } else if (isAgent && context.user) {
      // Brand-new account with no membership yet: create one as head.
      // Heads are agents (Phase 5) — headship lives in head_membership_id,
      // elevated per-request via context.isHead.
      const m = await client.query(
        `INSERT INTO app.memberships (agency_id, user_id, role, status)
         VALUES ($1, $2, 'agent', 'active') RETURNING id`,
        [agencyRow.id, context.user.id],
      );
      await client.query(
        `UPDATE app.agencies SET head_membership_id = $1 WHERE id = $2`,
        [m.rows[0].id, agencyRow.id],
      );
      await client.query(`UPDATE "user" SET role = 'agent' WHERE id = $1`, [context.user.id]);
      await ensureAgentRow(m.rows[0].id);
      headMembershipId = m.rows[0].id as string;
    }
    return agencyRow;
  });

  // Invite teammates while creating (best-effort — email failures never fail
  // the creation; the head can re-invite from Recruit/Membership later).
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const inviteSummary = { sent: 0, failed: [] as string[] };
  const inviteEmails = [...new Set((body.invites ?? []).map((i) => i.email.trim().toLowerCase()).filter(Boolean))];
  const validEmails = inviteEmails.filter((e) => EMAIL_RE.test(e));
  inviteSummary.failed.push(...inviteEmails.filter((e) => !EMAIL_RE.test(e)));
  if (validEmails.length > 0 && headMembershipId) {
    const origin = getAppBaseUrl(new URL(req.url).origin);
    for (const email of validEmails) {
      try {
        const token = crypto.randomBytes(24).toString("hex");
        await recruitmentInvites.create({
          inviter_membership_id: headMembershipId,
          invitee_email: email,
          token,
          sub_agency_id: null,
          agency_id: agency.id,
        });
        await sendEmail({
          to: email,
          subject: EMAIL_SUBJECTS.agencyInvite,
          html: agencyInviteEmail(`${origin}/register?invite=${token}`),
        });
        inviteSummary.sent++;
      } catch {
        inviteSummary.failed.push(email);
      }
    }
  } else if (validEmails.length > 0) {
    // No membership to attribute invites to (shouldn't happen — every
    // creator path above sets one, but fail loud in data, not silent).
    inviteSummary.failed.push(...validEmails);
  }

  return created({ ...agency, invites: inviteSummary }, isAgent ? "Agency created — you are now the agency head" : "Agency created");
}, { resource: "agency", action: "create" });
