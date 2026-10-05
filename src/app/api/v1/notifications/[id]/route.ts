import { apiHandler, ok, fail } from "@/server/api-utils";
import { notifications } from "@/server/repositories";

export const PATCH = apiHandler(async (req, context) => {
  const { id } = await context.params!;
  if (!["admin", "agent", "publisher"].includes(context.user?.role ?? "")) return fail("Forbidden", 403);
  const isAdmin = context.user?.role === "admin";
  // Scoped + idempotent: unknown ids, other-agency rows, and rows addressed
  // to another user resolve to 404; re-marking an already-read row still
  // returns 200 with the row.
  const notification = await notifications.markDispatchedScoped(id, context.agencyId ?? null, isAdmin, context.user?.id ?? null);
  if (!notification) return fail("Notification not found", 404);
  return ok(notification, "Notification updated");
  // Publisher-inclusive like GET: markDispatchedScoped already confines each
  // role to its own rows, so the guard is only a role allowlist.
}, { auth: true });
