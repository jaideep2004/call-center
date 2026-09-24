import { apiHandler, ok } from "@/server/api-utils";
import { getStripe } from "@/server/stripe";
import { getAppBaseUrl } from "@/server/app-url";
import { payments } from "@/server/repositories/payments";
import { stripeFeeCents } from "@/lib/format";
import { z } from "zod";

const checkoutSchema = z.object({
  amount_cents: z.number().int().min(100).max(5000000),
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
});

export const POST = apiHandler(async (req, context) => {
  const body = checkoutSchema.parse(await req.json());
  const agencyId = context.agencyId;
  if (!agencyId) return ok(null, "Agency not found");

  // Env-first base URL: req origin is wrong behind proxies/tunnels.
  const base = getAppBaseUrl(new URL(req.url).origin);
  const successUrl = body.success_url || `${base}/dashboard/wallet?payment=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = body.cancel_url || `${base}/dashboard/wallet?payment=cancelled`;

  // Phase 4 (point 3): the user-entered amount is the NET wallet credit;
  // a separate 3% line item is charged on top and stored for audit. The
  // webhook credits payment.amount_cents (net), never amount_total (gross).
  const creditCents = body.amount_cents;
  const feeCents = stripeFeeCents(creditCents);

  const session = await (await getStripe()).checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: "Wallet Top-Up" },
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
    metadata: { agency_id: agencyId, credit_cents: String(creditCents), fee_cents: String(feeCents) },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  try {
    await payments.create({
      agency_id: agencyId,
      stripe_session_id: session.id,
      amount_cents: creditCents,
      fee_cents: feeCents,
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
}, { resource: "wallet", action: "recharge" });
