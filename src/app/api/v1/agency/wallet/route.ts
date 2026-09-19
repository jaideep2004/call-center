import { apiHandler, ok, fail } from "@/server/api-utils";
import { validate, agencyPoolCheckoutSchema, agencyPoolEnabledSchema } from "@/server/validate";
import { agencyWallets } from "@/server/repositories";
import { getStripe } from "@/server/stripe";
import { payments } from "@/server/repositories/payments";

export const runtime = "nodejs";

/**
 * Agency pool wallet (P1.4, head only — `agency:manage`).
 * GET returns the pool plus per-agent allocations and remaining headroom.
 * POST creates a Stripe Checkout for pool top-up; the credit lands ONLY via
 * the webhook (`agency_wallet_topup` branch) so there is no mint vector.
 * PATCH toggles the pool (enables allocation counting in routing gates).
 */
export const GET = apiHandler(async (req, context) => {
  const agencyId = context.agencyId;
  if (!agencyId) return fail("Agency required", 403);
  const [pool, allocations] = await Promise.all([
    agencyWallets.getPool(agencyId),
    agencyWallets.listAllocations(agencyId),
  ]);
  const totalAllocated = allocations.reduce((sum, a) => sum + (a.allocated_cents ?? 0), 0);
  return ok({
    pool: { balance_cents: pool.balance_cents, enabled: pool.enabled },
    allocations,
    total_allocated_cents: totalAllocated,
    remaining_cents: pool.balance_cents - totalAllocated,
  });
}, { resource: "agency", action: "manage" });

export const POST = apiHandler(async (req, context) => {
  const agencyId = context.agencyId;
  if (!agencyId) return fail("Agency required", 403);
  const body = validate(agencyPoolCheckoutSchema, await req.json());

  const origin = new URL(req.url).origin;
  const successUrl = body.success_url || `${origin}/dashboard/wallet/pool?payment=success`;
  const cancelUrl = body.cancel_url || `${origin}/dashboard/wallet/pool?payment=cancelled`;

  const session = await (await getStripe()).checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: { name: "Agency Pool Wallet Top-Up" },
        unit_amount: body.amount_cents,
      },
      quantity: 1,
    }],
    client_reference_id: agencyId,
    metadata: { type: "agency_wallet_topup", agency_id: agencyId },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  await payments.create({
    agency_id: agencyId,
    stripe_session_id: session.id,
    amount_cents: body.amount_cents,
  });

  return ok({ url: session.url, sessionId: session.id });
}, { resource: "agency", action: "manage" });

export const PATCH = apiHandler(async (req, context) => {
  const agencyId = context.agencyId;
  if (!agencyId) return fail("Agency required", 403);
  const body = validate(agencyPoolEnabledSchema, await req.json());
  const pool = await agencyWallets.setPoolEnabled(agencyId, body.enabled);
  return ok({ balance_cents: pool.balance_cents, enabled: pool.enabled }, body.enabled ? "Pool wallet enabled" : "Pool wallet disabled");
}, { resource: "agency", action: "manage" });
