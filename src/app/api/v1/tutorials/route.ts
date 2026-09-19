import { apiHandler, ok, created } from "@/server/api-utils";
import { hasPermission } from "@/server/services/permission-data";
import type { Role } from "@/server/services/permission-data";
import { tutorials } from "@/server/repositories";
import { validate, createTutorialSchema } from "@/server/validate";

export const GET = apiHandler(async (req, context) => {
  const agencyId = context.agencyId;
  if (!agencyId) return ok([]);
  const category = new URL(req.url).searchParams.get("category");
  const canManage = hasPermission((context.user?.role ?? "") as Role, "agents", "manage");
  const rows = canManage
    ? await tutorials.findByAgency(agencyId)
    : await tutorials.findPublishedWithProgress(agencyId, context.user!.id);
  const filtered = category ? rows.filter((r) => r.category === category) : rows;
  return ok(filtered);
}, { resource: "agents", action: "view" });

export const POST = apiHandler(async (req, context) => {
  const body = validate(createTutorialSchema, await req.json());
  const row = await tutorials.create({
    agency_id: context.agencyId!,
    title: body.title,
    content: body.content,
    category: body.category,
    video_url: body.video_url ?? undefined,
    duration_seconds: body.duration_seconds ?? undefined,
    tags: body.tags,
    thumbnail_url: body.thumbnail_url ?? undefined,
    order_index: body.order_index,
    published: body.published,
    required: body.required,
  });
  return created(row);
}, { resource: "agents", action: "manage" });
