import { apiHandler, ok } from "@/server/api-utils";
import { leadTags } from "@/server/repositories";

export const GET = apiHandler(async (req, context) => {
  const { id } = await context.params;
  const tags = await leadTags.findByLead(id);
  return ok(tags);
}, { resource: "leads", action: "view" });

export const POST = apiHandler(async (req, context) => {
  const { id } = await context.params;
  const { tag } = await req.json() as { tag: string };
  await leadTags.addTag(context.agencyId!, id, tag);
  return ok(null, "Tag added");
}, { resource: "leads", action: "update" });

export const DELETE = apiHandler(async (req, context) => {
  const { id } = await context.params;
  const url = new URL(req.url);
  const tag = url.searchParams.get("tag");
  if (tag) await leadTags.removeTag(id, tag);
  return ok(null, "Tag removed");
}, { resource: "leads", action: "update" });
