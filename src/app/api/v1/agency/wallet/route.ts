import { apiHandler, ok, fail, requireHeadOr } from "@/server/api-utils";
import { getAppBaseUrl } from "@/server/app-url";
import { validate, agencyPoolCheckoutSchema, agencyPoolEnabledSchema } from "@/server/validate";
import { agencyWallets } from "@/server/repositories";
import { getStripe } from "@/server/stripe";
import { payments } from "@/server/repositories/payments";
import { stripeFeeCents } from "@/lib/format";

export const runtime = "nodejs";

/**
 * Agency pool wallet (P1.4, head only — `agency:manage`).
 * GET returns the pool plus per-agent allocations and remaining headroom.
 * POST creates a Stripe Checkout for pool top-up; the credit lands ONLY via
 * the webhook (`agency_wallet_topup` branch) so there is no mint vector.
 * PATCH toggles the pool (enables allocation counting in routing gates).
 */
export const GET = apiHandler(async (req, context) => {
  requireHeadOr(context, "agency", "manage");
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
}, { resource: "agency", action: "manage", allowHead: true });

export const POST = apiHandler(async (req, context) => {
  requireHeadOr(context, "agency", "manage");
  const agencyId = context.agencyId;
  if (!agencyId) return fail("Agency required", 403);
  const body = validate(agencyPoolCheckoutSchema, await req.json());

  // Env-first base URL: req origin is wrong behind proxies/tunnels.
  const base = getAppBaseUrl(new URL(req.url).origin);
  const successUrl = body.success_url || `${base}/dashboard/wallet/pool?payment=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = body.cancel_url || `${base}/dashboard/wallet/pool?payment=cancelled`;

  // Phase 4 (point 3): net credit + separate 3% fee line item (see wallet/create-checkout).
  const creditCents = body.amount_cents;
  const feeCents = stripeFeeCents(creditCents);

  const session = await (await getStripe()).checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: "Agency Pool Wallet Top-Up" },
          unit_amount: creditCents,
        },
        quantity: 1,
      },
      ...(feeCents > 0 ? [{
        price_data: {
          currency: "usd",
          product_data: { name: "Stripe payment processing fee (3%)" },
          unit_amount: feeCents,
        },
        quantity: 1 as const,
      }] : []),
    ],
    client_reference_id: agencyId,
    metadata: { type: "agency_wallet_topup", agency_id: agencyId, credit_cents: String(creditCents), fee_cents: String(feeCents) },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  try {
    await payments.create({
      agency_id: agencyId,
      stripe_session_id: session.id,
      amount_cents: creditCents,
      fee_cents: feeCents,
      livemode: session.livemode ?? true,
    });
  } catch (e) {
    // Never leave a payable Stripe session without an app row (Sept-22 $1
    // hole) — expire it; the webhook self-heals any race regardless.
    try {
      await (await getStripe()).checkout.sessions.expire(session.id);
    } catch {
      /* best-effort */
    }
    throw e;
  }

  return ok({ url: session.url, sessionId: session.id, credit_cents: creditCents, fee_cents: feeCents, charged_cents: creditCents + feeCents });
}, { resource: "agency", action: "manage", allowHead: true });

export const PATCH = apiHandler(async (req, context) => {
  requireHeadOr(context, "agency", "manage");
  const agencyId = context.agencyId;
  if (!agencyId) return fail("Agency required", 403);
  const body = validate(agencyPoolEnabledSchema, await req.json());
  const pool = await agencyWallets.setPoolEnabled(agencyId, body.enabled);
  return ok({ balance_cents: pool.balance_cents, enabled: pool.enabled }, body.enabled ? "Pool wallet enabled" : "Pool wallet disabled");
}, { resource: "agency", action: "manage", allowHead: true });
