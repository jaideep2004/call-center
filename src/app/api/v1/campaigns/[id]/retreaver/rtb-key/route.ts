import { apiHandler, ok, fail } from "@/server/api-utils";
import { campaigns } from "@/server/repositories";
import { encryptSecret } from "@/server/crypto";
import { randomBytes } from "node:crypto";

export const runtime = "nodejs";

const PLATFORM_ROLES = ["super_admin", "admin"];

function scopeFor(context: { agencyId?: string | null; user?: { role?: string } }): string | undefined {
  const scope = context.agencyId ?? undefined;
  if (!scope && !PLATFORM_ROLES.includes(context.user?.role ?? "")) {
    throw new Error("Agency scope required");
  }
  return scope;
}

/**
 * POST /api/v1/campaigns/[id]/retreaver/rtb-key
 * Auto-generate a 32-char hex postback key for RTB, encrypt and store.
 * For MVP this is a random key (real Retreaver postback keys must still be created in Retreaver UI for production RTB).
 * Sets rtb_enabled=true so the campaign becomes RTB-eligible.
 * Returns { key, rtbUrl } where rtbUrl is copyable demo URL.
 */
export const POST = apiHandler(async (_req, context) => {
  const { id } = await context.params;
  if (!id) return fail("Campaign id required", 400) as unknown as ReturnType<typeof ok>;

  // Verify campaign exists and agency scope allows access
  const scope = (() => {
    try {
      return scopeFor({ agencyId: context.agencyId ?? null, user: context.user });
    } catch {
      return undefined;
    }
  })();

  let campaign;
  try {
    campaign = await campaigns.findById(id, scope);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Campaign not found";
    return fail(msg, 404) as unknown as ReturnType<typeof ok>;
  }
  if (!campaign) return fail("Campaign not found", 404) as unknown as ReturnType<typeof ok>;

  // Generate 32-char hex (16 bytes)
  const key = randomBytes(16).toString("hex");
  let encrypted: string;
  try {
    encrypted = encryptSecret(key);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "ENCRYPTION_KEY not configured";
    return fail(msg, 500) as unknown as ReturnType<typeof ok>;
  }

  // Persist encrypted key and enable RTB atomically
  const updated = await campaigns.update(id, { rtb_postback_key_encrypted: encrypted, rtb_enabled: true }, scope);

  // Construct demo RTB URL – publisher_id is placeholder to be filled by agent's publisher; key is the generated one
  // Real Retreaver RTB endpoint: https://rtb.retreaver.com/rtbs.json?key=KEY&publisher_id=AFID
  const rtbUrl = `https://rtb.retreaver.com/rtbs.json?key=${key}&publisher_id=YOUR_PUBLISHER_ID`;

  return ok({ key, rtbUrl, campaign: updated }, "RTB key auto-generated (demo/testing - create the real key in Retreaver UI for production)");
}, { resource: "settings", action: "update" });
