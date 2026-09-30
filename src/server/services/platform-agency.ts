import { agents, memberships } from "@/server/repositories";
import { systemSettings } from "@/server/repositories";
import { queryOne } from "@/server/db";

export interface PlatformJoinResult {
  joined: boolean;
  membershipId: string | null;
  reason: string;
}

/**
 * Option A — home agency for solo agents: when an admin approves an agent
 * that belongs to no team, place them in the configured platform agency so
 * they can fund, subscribe and take calls without creating one. Teams,
 * heads and invites are untouched. Best-effort by design: approval must
 * never fail because placement did — every path returns a reason instead
 * of throwing.
 */
export async function ensurePlatformMembership(agentId: string): Promise<PlatformJoinResult> {
  try {
    const agent = await agents.findById(agentId).catch(() => null);
    if (!agent) return { joined: false, membershipId: null, reason: "agent_not_found" };
    if (agent.membership_id) {
      const mem = await memberships.findById(agent.membership_id).catch(() => null);
      if (mem && mem.status === "active") {
        return { joined: false, membershipId: mem.id, reason: "already_placed" };
      }
    }
    const userId = agent.user_id;
    if (!userId) return { joined: false, membershipId: null, reason: "no_login" };
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM app.memberships WHERE user_id = $1 AND status = 'active' LIMIT 1`,
      [userId],
    ).catch(() => null);
    if (existing) {
      // Belongs to a team but the profile row drifted — adopt, don't duplicate.
      const agencyId = await membershipAgency(existing.id);
      if (agencyId) {
        await agents.adoptOrCreate({
          agency_id: agencyId,
          membership_id: existing.id,
          user_id: userId,
          endpoint_types: ["webrtc"],
        }).catch(() => null);
      }
      return { joined: false, membershipId: existing.id, reason: "adopted_to_team" };
    }
    const platformAgencyId = (await systemSettings.get("platform_agency_id").catch(() => null)) as string | null;
    if (!platformAgencyId) return { joined: false, membershipId: null, reason: "no_platform_agency" };
    const created = await memberships.create({
      agency_id: platformAgencyId,
      user_id: userId,
      role: "agent",
    });
    await agents.adoptOrCreate({
      agency_id: platformAgencyId,
      membership_id: created.id,
      user_id: userId,
      endpoint_types: ["webrtc"],
    }).catch(() => null);
    return { joined: true, membershipId: created.id, reason: "joined_platform" };
  } catch (e) {
    return { joined: false, membershipId: null, reason: `error:${String((e as Error)?.message ?? e).slice(0, 80)}` };
  }
}

async function membershipAgency(membershipId: string): Promise<string | null> {
  const mem = await memberships.findById(membershipId).catch(() => null);
  return mem?.agency_id ?? null;
}
