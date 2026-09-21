import { queryOne } from "@/server/db";
import {
  EMAIL_SUBJECTS,
  agentApprovedEmail,
  agentWelcomeEmail,
  memberAddedEmail,
} from "@/server/email-templates";
import { notify } from "@/server/services/notify";

function dashboardUrl(path = "/dashboard"): string {
  const base = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://coveragecalls.com").replace(/\/$/, "");
  return `${base}${path}`;
}

async function userEmail(userId: string): Promise<string | null> {
  const row = await queryOne<{ email: string | null }>(
    `SELECT email FROM "user" WHERE id = $1`,
    [userId],
  );
  const email = row?.email?.trim();
  return email ? email : null;
}

async function membershipUserId(membershipId: string): Promise<string | null> {
  const row = await queryOne<{ user_id: string }>(
    `SELECT user_id FROM app.memberships WHERE id = $1`,
    [membershipId],
  );
  return row?.user_id ?? null;
}

async function agencyName(agencyId: string): Promise<string | null> {
  const row = await queryOne<{ name: string }>(
    `SELECT name FROM app.agencies WHERE id = $1`,
    [agencyId],
  );
  return row?.name ?? null;
}

/** Best-effort email — resolves the address, sends, never throws. */

/** Resolve a membership's login email (support replies, lead assignment). Never throws. */
export async function membershipEmail(membershipId: string): Promise<string | null> {
  try {
    const row = await queryOne<{ email: string | null }>(
      `SELECT u.email FROM app.memberships m
       JOIN "user" u ON u.id = m.user_id
       WHERE m.id = $1`,
      [membershipId],
    );
    const email = row?.email?.trim();
    return email ? email : null;
  } catch {
    return null;
  }
}

/**
 * Agent created (POST /agents): inbox + welcome email to the agent's login.
 * Never throws — creation must succeed even if mail is down.
 */
export async function sendAgentWelcome(opts: {
  agencyId: string;
  membershipId: string;
  agentId: string;
}): Promise<void> {
  try {
    const [userId, name] = await Promise.all([
      membershipUserId(opts.membershipId),
      agencyName(opts.agencyId),
    ]);
    if (!userId) return;
    const agentName = await queryOne<{ name: string | null }>(
      `SELECT u.name FROM app.agents a
       JOIN app.memberships m ON m.id = a.membership_id
       JOIN "user" u ON u.id = m.user_id
       WHERE a.id = $1`,
      [opts.agentId],
    ).then(
      (r) => r?.name ?? null,
      () => null,
    );
    const to = await userEmail(userId);
    const html = agentWelcomeEmail(dashboardUrl("/dashboard/take-calls"), name ?? undefined, agentName ?? undefined);
    await notify({
      agencyId: opts.agencyId,
      userId,
      topic: "agent.welcome",
      payload: { message: "Your agent profile was created", agent_id: opts.agentId, href: "/dashboard/take-calls" },
      emailTo: to,
      emailSubject: EMAIL_SUBJECTS.agentWelcome,
      emailHtml: html,
    });
  } catch (e) {
    console.warn("[action-emails] agent welcome failed:", String(e).slice(0, 200));
  }
}

/**
 * Agent approved (PATCH approval_status -> approved): inbox + email so the
 * agent knows they can go online. Never throws.
 */
export async function sendAgentApproved(opts: { agencyId: string; agentId: string }): Promise<void> {
  try {
    const row = await queryOne<{ user_id: string; name: string | null }>(
      `SELECT m.user_id, u.name FROM app.agents a
       JOIN app.memberships m ON m.id = a.membership_id
       JOIN "user" u ON u.id = m.user_id
       WHERE a.id = $1`,
      [opts.agentId],
    );
    if (!row?.user_id) return;
    const name = await agencyName(opts.agencyId);
    const to = await userEmail(row.user_id);
    const html = agentApprovedEmail(dashboardUrl("/dashboard/take-calls"), name ?? undefined, row.name ?? undefined);
    await notify({
      agencyId: opts.agencyId,
      userId: row.user_id,
      topic: "agent.approved",
      payload: { message: "Your agent profile was approved — you can go online", agent_id: opts.agentId, href: "/dashboard/take-calls" },
      emailTo: to,
      emailSubject: EMAIL_SUBJECTS.agentApproved,
      emailHtml: html,
    });
  } catch (e) {
    console.warn("[action-emails] agent approved mail failed:", String(e).slice(0, 200));
  }
}

/**
 * Member invited (POST /memberships/invite): email the invited user.
 * Never throws — the invite itself must succeed even if mail is down.
 */
export async function sendMemberAdded(opts: { agencyId: string; userId: string }): Promise<void> {
  try {
    const [name, to] = await Promise.all([agencyName(opts.agencyId), userEmail(opts.userId)]);
    const html = memberAddedEmail(dashboardUrl(), name ?? undefined);
    await notify({
      agencyId: opts.agencyId,
      userId: opts.userId,
      topic: "member.added",
      payload: { message: name ? `You were added to ${name}` : "You were added to an agency", href: "/dashboard" },
      emailTo: to,
      emailSubject: EMAIL_SUBJECTS.memberAdded,
      emailHtml: html,
    });
  } catch (e) {
    console.warn("[action-emails] member added mail failed:", String(e).slice(0, 200));
  }
}
