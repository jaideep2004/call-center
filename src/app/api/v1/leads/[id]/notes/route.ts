import { apiHandler, ok, created } from "@/server/api-utils";
import { leadNotes } from "@/server/repositories";

export const GET = apiHandler(async (req, context) => {
  const { id } = await context.params;
  const notes = await leadNotes.findMany({
    filters: { lead_id: id, agency_id: context.agencyId! },
    sortBy: "created_at",
    order: "desc",
  });
  return ok(notes.rows);
}, { resource: "leads", action: "view" });

export const POST = apiHandler(async (req, context) => {
  const { id } = await context.params;
  const { content } = await req.json() as { content: string };
  const note = await leadNotes.create({
    agency_id: context.agencyId!,
    lead_id: id,
    content,
    author_membership_id: context.membership?.id ?? null,
  });
  return created(note);
}, { resource: "leads", action: "update" });
