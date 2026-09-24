import { apiHandler, ok } from "@/server/api-utils";
import { notifications } from "@/server/repositories";

export const POST = apiHandler(async (req, context) => {
  const isAdmin = context.user?.role === "admin";
  const marked = await notifications.markAllDispatchedScoped(context.agencyId ?? null, isAdmin, context.user?.id ?? null);
  return ok({ marked }, "All notifications marked as read");
}, { resource: "settings", action: "update" });
