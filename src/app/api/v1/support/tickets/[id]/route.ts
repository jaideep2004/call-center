import { apiHandler, ok, fail } from "@/server/api-utils";
import { supportTickets } from "@/server/repositories";
import { z } from "zod";

const replySchema = z.object({ body: z.string().min(1).max(10000) });
const statusSchema = z.object({ status: z.enum(["open", "in_progress", "resolved", "closed"]) });

export const GET = apiHandler(async (req, { params, agencyId }) => {
  const { id } = await params;
  if (!agencyId) return fail("Agency scope required", 403);
  const ticket = await supportTickets.findByIdForAgency(id, agencyId);
  if (!ticket) return fail("Ticket not found", 404);
  const replies = await supportTickets.repliesFor(id);
  return ok({ ...ticket, replies });
}, { resource: "support", action: "view" });

export const POST = apiHandler(async (req, { params, agencyId, membership }) => {
  const { id } = await params;
  if (!agencyId || !membership) return fail("Membership required", 403);
  const ticket = await supportTickets.findByIdForAgency(id, agencyId);
  if (!ticket) return fail("Ticket not found", 404);
  const { body } = replySchema.parse(await req.json());
  const reply = await supportTickets.addReply(id, membership.id, body);
  return ok(reply, "Reply added");
}, { resource: "support", action: "view" });

export const PATCH = apiHandler(async (req, { params, agencyId, user }) => {
  const { id } = await params;
  const scope = agencyId ?? undefined;
  if (!scope && !["super_admin", "admin"].includes(user?.role ?? "")) return fail("Agency scope required", 403);
  const { status } = statusSchema.parse(await req.json());
  const ticket = await supportTickets.setStatus(id, status, scope);
  if (!ticket) return fail("Ticket not found", 404);
  return ok(ticket, "Status updated");
}, { resource: "support", action: "manage" });
