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
  const campaign = await campaigns.update(id, data, scopeFor({ agencyId, user }));
  return ok(campaign, "Campaign updated");
}, { resource: "settings", action: "update" });

export const DELETE = apiHandler(async (req, { params, agencyId, user }) => {
  const { id } = await params;
  await campaigns.softDelete(id, scopeFor({ agencyId, user }));
  return noContent();
}, { resource: "settings", action: "delete" });
