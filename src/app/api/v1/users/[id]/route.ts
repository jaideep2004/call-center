import { apiHandler, ok, fail } from "@/server/api-utils";
import { query, queryOne, transaction } from "@/server/db";

/**
 * DELETE /api/v1/users/[id] — platform-admin-only HARD delete.
 * Removes the auth user plus their memberships/agents. Business rows that
 * must survive (publishers) are unlinked, not deleted. If the user owns
 * history protected by FKs (calls, wallet, tickets, agency headship),
 * the transaction aborts with 409 — suspend the membership instead.
 */
export const DELETE = apiHandler(async (req, context) => {
  const { id } = await context.params;

  const target = await queryOne<{ id: string; role: string | null }>(
    `SELECT id, role FROM "user" WHERE id = $1`,
    [id],
  );
  if (!target) return fail("User not found", 404);
  if (context.user?.id === id) {
    return fail("You cannot delete your own account", 400);
  }
  if (target.role === "admin") {
    const remaining = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM "user" WHERE role = 'admin' AND id <> $1`,
      [id],
    );
    if (Number(remaining?.count ?? 0) === 0) {
      return fail("Cannot delete the last admin account", 400);
    }
  }

  try {
    await transaction(async (client) => {
      // Invites authored by this user's memberships (FK -> memberships).
      await query(
        `DELETE FROM app.recruitment_invites WHERE inviter_membership_id IN
          (SELECT id FROM app.memberships WHERE user_id = $1)`,
        [id],
        client,
      );
      // Agent profiles owned directly or via membership (FK -> memberships,
      // so agents go before memberships). Agents with call/wallet history
      // are FK-protected and abort the transaction -> 409 below.
      await query(
        `DELETE FROM app.agents WHERE user_id = $1 OR membership_id IN
          (SELECT id FROM app.memberships WHERE user_id = $1)`,
        [id],
        client,
      );
      await query(`DELETE FROM app.memberships WHERE user_id = $1`, [id], client);
      // Keep the publisher business row, just unlink the login.
      await query(`UPDATE app.publishers SET user_id = NULL WHERE user_id = $1`, [id], client);
      // Better-auth sessions/accounts cascade, but delete explicitly in case
      // the FK is ever relaxed.
      await query(`DELETE FROM session WHERE "userId" = $1`, [id], client);
      await query(`DELETE FROM account WHERE "userId" = $1`, [id], client);
      await query(`DELETE FROM "user" WHERE id = $1`, [id], client);
    });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === "23503") {
      return fail(
        "Cannot delete: this user owns linked records (calls, wallet, tickets, or agency headship). Suspend the membership instead.",
        409,
      );
    }
    throw e;
  }

  return ok({ id }, "User deleted permanently");
}, { resource: "users", action: "delete" });
