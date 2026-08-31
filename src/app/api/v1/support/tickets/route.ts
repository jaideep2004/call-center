import { apiHandler, ok, created, fail } from "@/server/api-utils";
import { supportTickets } from "@/server/repositories";
import { z } from "zod";

const createTicketSchema = z.object({
  subject: z.string().min(1).max(255),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
});

export const GET = apiHandler(async (req, context) => {
  const agencyId = context.agencyId;
  if (!agencyId) return ok([]);
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const rows = await supportTickets.findManyForAgency(agencyId, status);
  if (url.searchParams.get("mine") === "1" && context.membership) {
    return ok(rows.filter((t) => t.requester_membership_id === context.membership!.id));
  }
  return ok(rows);
}, { resource: "support", action: "view" });

export const POST = apiHandler(async (req, context) => {
  if (!context.membership || !context.agencyId) return fail("Membership required", 403);
  const body = createTicketSchema.parse(await req.json());
  const ticket = await supportTickets.create({
    agency_id: context.agencyId,
    requester_membership_id: context.membership.id,
    subject: body.subject,
    priority: body.priority,
  });
  return created(ticket, "Ticket created");
}, { resource: "support", action: "create" });
