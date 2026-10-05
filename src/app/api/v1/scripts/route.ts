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
      // Own unbound first, then the global library (deduped). Campaign-bound
      // scripts stay strictly agency-scoped.
      const [own, global] = await Promise.all([
        scripts.findUnbound(agencyId),
        scripts.findGlobalUnbound(),
      ]);
      const seen = new Set(own.map((r) => r.id));
      rows = [...own, ...global.filter((r) => !seen.has(r.id))];
    }
  } else {
    rows = await scripts.findByAgency(agencyId);
  }
  if (category) rows = rows.filter((r) => r.category === category);
  return ok(rows);
}, { resource: "agents", action: "view" });

export const POST = apiHandler(async (req, context) => {
  const body = validate(createScriptSchema, await req.json());
  // Admins may file platform-global (agency_id null) or into any agency;
  // everyone else files into their own agency (any value sent is ignored).
  const agencyId = context.user?.role === "admin" && body.agency_id !== undefined
    ? body.agency_id
    : (context.agencyId ?? null);
  const row = await scripts.create({
    agency_id: agencyId,
    title: body.title,
    content: body.content,
    category: body.category,
    tags: body.tags,
    campaign_id: body.campaign_id ?? null,
  });
  return created(row);
}, { resource: "agents", action: "manage" });
