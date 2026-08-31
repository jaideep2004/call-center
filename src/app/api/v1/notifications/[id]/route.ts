import { apiHandler, ok } from "@/server/api-utils";
import { notifications } from "@/server/repositories";

export const PATCH = apiHandler(async (req, { params }) => {
  const { id } = await params;
  const notification = await notifications.markDispatched(id);
  return ok(notification, "Notification updated");
}, { resource: "settings", action: "update" });
