import { apiHandler, ok, created } from "@/server/api-utils";
import { leadTimeline } from "@/server/repositories";
import { validate } from "@/server/validate";
import { z } from "zod";

const createTimelineSchema = z.object({
  actor_membership_id: z.string().optional(),
  type: z.string().min(1).max(100),
  body: z.record(z.unknown()).default({}),
});

export const GET = apiHandler(async (req, context) => {
  const { id } = await context.params;
  const events = await leadTimeline.findByLead(id);
  return ok(events);
}, { resource: "leads", action: "view" });

export const POST = apiHandler(async (req, context) => {
  const { id } = await context.params;
  const body = validate(createTimelineSchema, await req.json());
  const event = await leadTimeline.create({ ...body, lead_id: id, agency_id: context.agencyId! });
  return created(event);
}, { resource: "leads", action: "create" });
