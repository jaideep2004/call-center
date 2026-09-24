import { queryOne } from "@/server/db";
import {
  EMAIL_SUBJECTS,
  agentApprovedEmail,
  agentWelcomeEmail,
  memberAddedEmail,
  subscriptionActiveEmail,
  supportTicketRaisedEmail,
  walletTopupEmail,
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

/** Agent's login identity for receipts. Never throws. */
async function agentIdentity(agentId: string): Promise<{ userId: string | null; name: string | null }> {
  try {
    const row = await queryOne<{ user_id: string; name: string | null }>(
      `SELECT m.user_id, u.name FROM app.agents a
        JOIN app.memberships m ON m.id = a.membership_id
        JOIN "user" u ON u.id = m.user_id
       WHERE a.id = $1`,
      [agentId],
    );
    return { userId: row?.user_id ?? null, name: row?.name ?? null };
  } catch {
    return { userId: null, name: null };
  }
}

/** Agency head's login identity ("the admin" for agency-scoped mail). Never throws. */
async function agencyHeadIdentity(agencyId: string): Promise<{ userId: string | null; name: string | null }> {
  try {
    const row = await queryOne<{ user_id: string; name: string | null }>(
      `SELECT m.user_id, u.name FROM app.agencies ag
        JOIN app.memberships m ON m.id = ag.head_membership_id
        JOIN "user" u ON u.id = m.user_id
       WHERE ag.id = $1`,
      [agencyId],
    );
    return { userId: row?.user_id ?? null, name: row?.name ?? null };
  } catch {
    return { userId: null, name: null };
  }
}

/**
 * Wallet top-up credited (webhook or reconcile): receipt to the agent AND a
 * copy to the agency head. Never throws — money already moved.
 */
export async function sendWalletTopup(opts: {
  agencyId: string;
  agentId: string | null;
  amountCents: number;
  feeCents: number;
}): Promise<void> {
  try {
    const name = await agencyName(opts.agencyId);
    if (opts.agentId) {
      const agent = await agentIdentity(opts.agentId);
      const head = await agencyHeadIdentity(opts.agencyId);
      const amount = `$${(opts.amountCents / 100).toFixed(2)}`;
      if (agent.userId) {
        const to = await userEmail(agent.userId);
        await notify({
          agencyId: opts.agencyId,
          userId: agent.userId,
          topic: "wallet.topup",
          payload: { message: `${amount} credited to your wallet`, agent_id: opts.agentId, href: "/dashboard/wallet/agent" },
          emailTo: to,
          emailSubject: EMAIL_SUBJECTS.walletTopup,
          emailHtml: walletTopupEmail({ dashboardUrl: dashboardUrl("/dashboard/wallet/agent"), agencyName: name ?? undefined, agentName: agent.name ?? undefined, amountCents: opts.amountCents, feeCents: opts.feeCents }),
        });
      }
      if (head.userId && head.userId !== agent.userId) {
        const to = await userEmail(head.userId);
        await notify({
          agencyId: opts.agencyId,
          userId: head.userId,
          topic: "wallet.topup",
          payload: { message: `${agent.name ?? "An agent"} topped up ${amount}`, agent_id: opts.agentId, href: "/dashboard/wallet" },
          emailTo: to,
          emailSubject: EMAIL_SUBJECTS.walletTopup,
          emailHtml: walletTopupEmail({ dashboardUrl: dashboardUrl("/dashboard/wallet"), agencyName: name ?? undefined, agentName: agent.name ?? undefined, amountCents: opts.amountCents, feeCents: opts.feeCents, forHead: true }),
        });
      }
    } else {
      // Agency pool top-up: head only.
      const head = await agencyHeadIdentity(opts.agencyId);
      if (head.userId) {
        const to = await userEmail(head.userId);
        const amount = `$${(opts.amountCents / 100).toFixed(2)}`;
        await notify({
          agencyId: opts.agencyId,
          userId: head.userId,
          topic: "wallet.topup",
          payload: { message: `Agency pool topped up ${amount}`, href: "/dashboard/wallet/pool" },
          emailTo: to,
          emailSubject: EMAIL_SUBJECTS.walletTopup,
          emailHtml: walletTopupEmail({ dashboardUrl: dashboardUrl("/dashboard/wallet/pool"), agencyName: name ?? undefined, amountCents: opts.amountCents, feeCents: opts.feeCents, forHead: true }),
        });
      }
    }
  } catch (e) {
    console.warn("[action-emails] wallet topup mail failed:", String(e).slice(0, 200));
  }
}

/**
 * Subscription activated (webhook): receipt to the agent AND a copy to the
 * agency head. Only sent on first activation, never on redelivery.
 */
export async function sendSubscriptionActive(opts: {
  agencyId: string;
  agentId: string;
  planName?: string;
}): Promise<void> {
  try {
    const [name, agent, head] = await Promise.all([
      agencyName(opts.agencyId),
      agentIdentity(opts.agentId),
      agencyHeadIdentity(opts.agencyId),
    ]);
    if (agent.userId) {
      const to = await userEmail(agent.userId);
      await notify({
        agencyId: opts.agencyId,
        userId: agent.userId,
        topic: "subscription.active",
        payload: { message: opts.planName ? `Subscription activated: ${opts.planName}` : "Subscription activated", agent_id: opts.agentId, href: "/dashboard/agents/subscription" },
        emailTo: to,
        emailSubject: EMAIL_SUBJECTS.subscriptionActive,
        emailHtml: subscriptionActiveEmail({ dashboardUrl: dashboardUrl("/dashboard/agents/subscription"), agencyName: name ?? undefined, agentName: agent.name ?? undefined, planName: opts.planName }),
      });
    }
    if (head.userId && head.userId !== agent.userId) {
      const to = await userEmail(head.userId);
      await notify({
        agencyId: opts.agencyId,
        userId: head.userId,
        topic: "subscription.active",
        payload: { message: `${agent.name ?? "An agent"} activated a subscription${opts.planName ? `: ${opts.planName}` : ""}`, agent_id: opts.agentId, href: "/dashboard/agents" },
        emailTo: to,
        emailSubject: EMAIL_SUBJECTS.subscriptionActive,
        emailHtml: subscriptionActiveEmail({ dashboardUrl: dashboardUrl("/dashboard/agents"), agencyName: name ?? undefined, agentName: agent.name ?? undefined, planName: opts.planName, forHead: true }),
      });
    }
  } catch (e) {
    console.warn("[action-emails] subscription mail failed:", String(e).slice(0, 200));
  }
}

/**
 * Support ticket raised: confirmation to the requester + alert to the agency
 * head. Never throws — the ticket already exists.
 */
export async function sendSupportTicketRaised(opts: {
  agencyId: string;
  ticketId: string;
  subject: string;
  priority: string;
  requesterMembershipId: string;
}): Promise<void> {
  try {
    const requesterId = await membershipUserId(opts.requesterMembershipId);
    const [requesterName, head] = await Promise.all([
      requesterId
        ? queryOne<{ name: string | null }>(`SELECT name FROM "user" WHERE id = $1`, [requesterId]).then((r) => r?.name ?? null, () => null)
        : Promise.resolve(null),
      agencyHeadIdentity(opts.agencyId),
    ]);
    if (requesterId) {
      const to = await userEmail(requesterId);
      await notify({
        agencyId: opts.agencyId,
        userId: requesterId,
        topic: "support.raised",
        payload: { message: `Ticket received: ${opts.subject}`, ticket_id: opts.ticketId, href: "/dashboard/support" },
        emailTo: to,
        emailSubject: EMAIL_SUBJECTS.ticketRaised,
        emailHtml: supportTicketRaisedEmail({ dashboardUrl: dashboardUrl("/dashboard/support"), subject: opts.subject, priority: opts.priority }),
      });
    }
    if (head.userId && head.userId !== requesterId) {
      const to = await userEmail(head.userId);
      await notify({
        agencyId: opts.agencyId,
        userId: head.userId,
        topic: "support.raised",
        payload: { message: `New ${opts.priority} ticket: ${opts.subject}`, ticket_id: opts.ticketId, href: "/dashboard/admin/support" },
        emailTo: to,
        emailSubject: EMAIL_SUBJECTS.ticketRaised,
        emailHtml: supportTicketRaisedEmail({ dashboardUrl: dashboardUrl("/dashboard/admin/support"), subject: opts.subject, priority: opts.priority, requesterName: requesterName ?? undefined, forHead: true }),
      });
    }
  } catch (e) {
    console.warn("[action-emails] ticket raised mail failed:", String(e).slice(0, 200));
  }
}
