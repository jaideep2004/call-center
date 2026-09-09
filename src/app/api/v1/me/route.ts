import { apiHandler, ok } from "@/server/api-utils";
import { agents, publishers } from "@/server/repositories";
import { queryOne } from "@/server/db";

export const GET = apiHandler(async (req, context) => {
  let agentId: string | null = null;
  if (context.membership?.id) {
    const agent = await agents.findByMembershipId(context.membership.id);
    agentId = agent?.id ?? null;
  }
  let publisher: { id: string; name: string } | null = null;
  let publisherId: string | null = null;
  if (context.user?.id) {
    const pub = await publishers.findByUserId(context.user.id);
    if (pub) {
      publisher = { id: pub.id, name: pub.name };
      publisherId = pub.id;
    } else if (context.user.email) {
      // Auto-detect unlinked publisher by email (admin created publisher before user registered)
      const byEmail = await queryOne<{ id: string; name: string }>(
        `SELECT id, name FROM app.publishers WHERE lower(email) = lower($1) AND user_id IS NULL AND deleted_at IS NULL LIMIT 1`,
        [context.user.email],
      );
      if (byEmail) {
        // Attempt to auto-link this user to the publisher (publisher portal without explicit invite)
        // Only for non-admin/agent users without an existing membership to avoid hijacking agency accounts.
        const canLink = !context.membership && context.user.role !== "super_admin" && context.user.role !== "admin" && context.user.role !== "manager" && context.user.role !== "finance";
        if (canLink) {
          try {
            const { query } = await import("@/server/db");
            const { clearAuthCache } = await import("@/server/api-utils");
            await query(`UPDATE app.publishers SET user_id = $1, updated_at = now() WHERE id = $2 AND user_id IS NULL`, [context.user.id, byEmail.id]);
            await query(`UPDATE "user" SET role = 'publisher' WHERE id = $1 AND role = 'agent'`, [context.user.id]);
            clearAuthCache();
            publisher = { id: byEmail.id, name: byEmail.name };
            publisherId = byEmail.id;
          } catch {
            // fallback to unlinked detection without persisting
            publisher = { id: byEmail.id, name: byEmail.name };
            publisherId = byEmail.id;
          }
        } else {
          publisher = { id: byEmail.id, name: byEmail.name };
          publisherId = byEmail.id;
        }
      }
    }
  }
  // Mirror publisher linkage to role for clients that still hold stale session.role
  let user = context.user;
  if (publisherId && user && user.role !== "publisher" && user.role !== "super_admin" && user.role !== "admin") {
    user = { ...user, role: "publisher" } as typeof user;
  }
  return ok({
    user,
    membership: context.membership,
    agencyId: context.agencyId,
    agentId,
    publisherId,
    publisher,
  });
});
