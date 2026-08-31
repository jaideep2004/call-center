import { apiHandler, ok, created } from "@/server/api-utils";
import { notifications } from "@/server/repositories";
import { validate, createNotificationSchema } from "@/server/validate";
import { queryOne } from "@/server/db";
import { publishCallEvent } from "@/lib/event-bridge";

export const GET = apiHandler(async (req, context) => {
  const rows = await notifications.findMany(50, context.agencyId ?? undefined);
  return ok(rows);
}, { resource: "settings", action: "view" });

export const POST = apiHandler(async (req, context) => {
  const body = validate(createNotificationSchema, await req.json());
  const notification = await notifications.create({ ...body, agency_id: context.agencyId ?? body.agency_id });

  // Real-time push: the gateway delivers to the agent's socket room so the
  // notification appears without a refresh (lifecycle #31).
  if (body.user_id) {
    const membership = await queryOne<{ id: string }>(
      "SELECT id FROM app.memberships WHERE user_id = $1 AND status = 'active' LIMIT 1",
      [body.user_id],
    ).catch(() => null);
    if (membership) {
      void publishCallEvent(membership.id, "notification:new", {
        id: notification.id,
        topic: notification.topic,
        payload: notification.payload,
      });
    }
  }
  return created(notification);
}, { resource: "settings", action: "create" });
