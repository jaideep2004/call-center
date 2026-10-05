import { apiHandler, ok, fail } from "@/server/api-utils";
import { notifications } from "@/server/repositories";

export const POST = apiHandler(async (req, context) => {
  if (!["admin", "agent", "publisher"].includes(context.user?.role ?? "")) return fail("Forbidden", 403);
  const isAdmin = context.user?.role === "admin";
  const marked = await notifications.markAllDispatchedScoped(context.agencyId ?? null, isAdmin, context.user?.id ?? null);
  return ok({ marked }, "All notifications marked as read");
  // Publisher-inclusive like GET: markAllDispatchedScoped already confines
  // each role to its own rows, so the guard is only a role allowlist.
}, { auth: true });
