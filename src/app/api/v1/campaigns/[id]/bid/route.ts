import { apiHandler, ok, noContent, fail } from "@/server/api-utils";
import { campaigns, bidOverrides } from "@/server/repositories";
import { z } from "zod";

const bidSchema = z.object({
  price_cents: z.number().int().min(0).nullable().optional(),
  payout_cents: z.number().int().min(0).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
});

/**
 * Manual bid override for a campaign (client Q2/Q4). Applies immediately to
 * agent billing (price_cents) and publisher payouts (payout_cents). No
 * schedule — admin edits the bid whenever call volume is low.
 */
export const GET = apiHandler(async (req, { params, agencyId }) => {
  const { id } = await params;
  const campaign = await campaigns.findById(id, agencyId ?? undefined).catch(() => null);
  if (!campaign) return fail("Campaign not found", 404);
  const override = await bidOverrides.findLatest(id);
  return ok({ campaign_id: id, override });
}, { resource: "settings", action: "view" });

export const PUT = apiHandler(async (req, { params, agencyId, membership }) => {
  const { id } = await params;
  const campaign = await campaigns.findById(id, agencyId ?? undefined).catch(() => null);
  if (!campaign) return fail("Campaign not found", 404);
  const body = bidSchema.parse(await req.json());
  const override = await bidOverrides.upsert(id, {
    price_cents: body.price_cents ?? null,
    payout_cents: body.payout_cents ?? null,
    note: body.note ?? null,
    createdBy: membership?.id ?? null,
  });
  return ok(override, "Bid updated");
}, { resource: "settings", action: "manage" });

export const DELETE = apiHandler(async (req, { params, agencyId }) => {
  const { id } = await params;
  const campaign = await campaigns.findById(id, agencyId ?? undefined).catch(() => null);
  if (!campaign) return fail("Campaign not found", 404);
  await bidOverrides.clear(id);
  return noContent();
}, { resource: "settings", action: "manage" });
