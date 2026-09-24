import { apiHandler, ok, created, fail, noContent } from "@/server/api-utils";
import { campaignCreatives, campaigns } from "@/server/repositories";
import { validate, createCreativeSchema, updateCreativeSchema } from "@/server/validate";
import { normalizeMediaUrl } from "@/lib/format";

export const runtime = "nodejs";

/**
 * Admin creative CRUD (P2.1, cms:manage). Linked campaigns must belong to the
 * caller's agency (no cross-tenant links).
 */
export const GET = apiHandler(async (req, context) => {
  if (!context.agencyId) return fail("Agency required", 403);
  const rows = await campaignCreatives.listCreatives(context.agencyId);
  return ok(rows);
}, { resource: "cms", action: "manage" });

export const POST = apiHandler(async (req, context) => {
  const agencyId = context.agencyId;
  if (!agencyId) return fail("Agency required", 403);
  const body = validate(createCreativeSchema, await req.json());
  if (body.campaign_id) {
    const campaign = await campaigns.findById(body.campaign_id, agencyId).catch(() => null);
    if (!campaign) return fail("Campaign not found in your agency", 404);
  }
  const row = await campaignCreatives.createCreative({
    agency_id: agencyId,
    ...body,
    // Canonicalize share links (Google Drive → direct) at write time so
    // every reader gets a renderable URL without client-side patching.
    ...(body.media_url ? { media_url: normalizeMediaUrl(body.media_url) } : {}),
  });
  return created(row, "Creative created");
}, { resource: "cms", action: "manage" });

export const PATCH = apiHandler(async (req, context) => {
  const agencyId = context.agencyId;
  if (!agencyId) return fail("Agency required", 403);
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return fail("id query param required", 400);
  const body = validate(updateCreativeSchema, await req.json());
  if (body.campaign_id) {
    const campaign = await campaigns.findById(body.campaign_id, agencyId).catch(() => null);
    if (!campaign) return fail("Campaign not found in your agency", 404);
  }
  const row = await campaignCreatives.updateCreative(id, agencyId, {
    ...body,
    ...(body.media_url ? { media_url: normalizeMediaUrl(body.media_url) } : {}),
  });
  if (!row) return fail("Creative not found", 404);
  return ok(row, "Creative updated");
}, { resource: "cms", action: "manage" });

export const DELETE = apiHandler(async (req, context) => {
  const agencyId = context.agencyId;
  if (!agencyId) return fail("Agency required", 403);
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return fail("id query param required", 400);
  await campaignCreatives.softDeleteCreative(id, agencyId);
  return noContent();
}, { resource: "cms", action: "manage" });
