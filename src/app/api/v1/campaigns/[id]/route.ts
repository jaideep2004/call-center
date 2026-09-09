import { apiHandler, ok, noContent } from "@/server/api-utils";
import { campaigns } from "@/server/repositories";
import { ForbiddenError } from "@/server/errors";
import { validate, updateCampaignSchema } from "@/server/validate";
import { assertValidSkills } from "@/server/services/skills.service";
import { encryptSecret } from "@/server/crypto";

const PLATFORM_ROLES = ["super_admin", "admin"];

function scopeFor(context: { agencyId?: string | null; user?: { role?: string } }): string | undefined {
  const scope = context.agencyId ?? undefined;
  if (!scope && !PLATFORM_ROLES.includes(context.user?.role ?? "")) {
    throw new ForbiddenError("Agency scope required");
  }
  return scope;
}

export const GET = apiHandler(async (req, { params, agencyId, user }) => {
  const { id } = await params;
  const campaign = await campaigns.findById(id, scopeFor({ agencyId, user }));
  return ok(campaign);
}, { resource: "settings", action: "view" });

export const PATCH = apiHandler(async (req, { params, agencyId, user }) => {
  const { id } = await params;
  const body = validate(updateCampaignSchema, await req.json());
  if (body.required_skills) {
    body.required_skills = await assertValidSkills(body.required_skills);
  }
  const data: Record<string, unknown> = { ...body };
  delete data.rtb_postback_key;
  if (body.rtb_postback_key) {
    data.rtb_postback_key_encrypted = encryptSecret(body.rtb_postback_key);
  }
  if (body.retreaver_cid !== undefined) {
    data.retreaver_cid = body.retreaver_cid || null;
  }
  // Multi-publisher: if publisher_ids supplied, use join table (keep legacy column in sync)
  if (body.publisher_ids !== undefined) {
    const ids = (body.publisher_ids ?? []) as string[];
    await campaigns.setPublisherIds(id, ids);
    delete data.publisher_ids;
    delete data.publisher_id;
  } else if (body.publisher_id !== undefined) {
    // Single publisher update -> also sync join table for consistency
    const single = body.publisher_id as string | null;
    await campaigns.setPublisherIds(id, single ? [single] : []);
    delete data.publisher_id;
  }
  // If no campaign fields remain after publisher handling, just return with updated publishers
  const hasOtherFields = Object.keys(data).some((k) => k !== "publisher_ids" && k !== "publisher_id");
  if (!hasOtherFields && (body.publisher_ids !== undefined || body.publisher_id !== undefined)) {
    const campaign = await campaigns.findById(id, scopeFor({ agencyId, user }));
    return ok(campaign, "Campaign publishers updated");
  }
  if (Object.keys(data).length === 0) {
    const campaign = await campaigns.findById(id, scopeFor({ agencyId, user }));
    return ok(campaign, "Campaign updated");
  }
  const campaign = await campaigns.update(id, data, scopeFor({ agencyId, user }));
  return ok(campaign, "Campaign updated");
}, { resource: "settings", action: "update" });

export const DELETE = apiHandler(async (req, { params, agencyId, user }) => {
  const { id } = await params;
  await campaigns.softDelete(id, scopeFor({ agencyId, user }));
  return noContent();
}, { resource: "settings", action: "delete" });
