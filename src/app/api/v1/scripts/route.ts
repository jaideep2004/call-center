import { apiHandler, ok, created } from "@/server/api-utils";
import { scripts } from "@/server/repositories";
import { validate, createScriptSchema } from "@/server/validate";

export const GET = apiHandler(async (req, context) => {
  const agencyId = context.agencyId;
  if (!agencyId) return ok([]);
  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const campaignId = url.searchParams.get("campaign_id");

  let rows;
  if (campaignId) {
    rows = await scripts.findScriptsForCampaign(agencyId, campaignId);
    if (rows.length === 0) {
      rows = await scripts.findUnbound(agencyId);
    }
  } else {
    rows = await scripts.findByAgency(agencyId);
  }
  if (category) rows = rows.filter((r) => r.category === category);
  return ok(rows);
}, { resource: "agents", action: "view" });

export const POST = apiHandler(async (req, context) => {
  const body = validate(createScriptSchema, await req.json());
  const row = await scripts.create({
    agency_id: context.agencyId!,
    title: body.title,
    content: body.content,
    category: body.category,
    tags: body.tags,
    campaign_id: body.campaign_id ?? null,
  });
  return created(row);
}, { resource: "agents", action: "manage" });
