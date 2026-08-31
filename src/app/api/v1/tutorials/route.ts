import { apiHandler, ok, created } from "@/server/api-utils";
import { tutorials } from "@/server/repositories";

export const GET = apiHandler(async (req, context) => {
  const agencyId = context.agencyId;
  if (!agencyId) return ok([]);
  const category = new URL(req.url).searchParams.get("category");
  let rows = await tutorials.findByAgency(agencyId);
  if (category) rows = rows.filter((r) => r.category === category);
  return ok(rows);
}, { resource: "agents", action: "view" });

export const POST = apiHandler(async (req, context) => {
  const body = await req.json();
  const row = await tutorials.create({
    agency_id: context.agencyId!,
    title: body.title,
    content: body.content,
    category: body.category ?? "general",
    video_url: body.video_url,
    duration_seconds: body.duration_seconds,
    tags: body.tags ?? [],
  });
  return created(row);
}, { resource: "agents", action: "manage" });
