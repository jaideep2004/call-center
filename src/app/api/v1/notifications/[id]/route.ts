import { apiHandler, ok, fail } from "@/server/api-utils";
import { notifications } from "@/server/repositories";

export const PATCH = apiHandler(async (req, context) => {
  const { id } = await context.params!;
  const isAdmin = context.user?.role === "admin";
  // Scoped + idempotent: unknown ids and other-agency rows resolve to 404,
  // re-marking an already-read row still returns 200 with the row.
  const notification = await notifications.markDispatchedScoped(id, context.agencyId ?? null, isAdmin);
  if (!notification) return fail("Notification not found", 404);
  return ok(notification, "Notification updated");
}, { resource: "settings", action: "update" });
