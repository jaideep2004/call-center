import { apiHandler, ok } from "@/server/api-utils";
import { getStripe } from "@/server/stripe";
import { payments } from "@/server/repositories/payments";
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

  const origin = new URL(req.url).origin;
  const successUrl = body.success_url || `${origin}/dashboard/wallet?payment=success`;
  const cancelUrl = body.cancel_url || `${origin}/dashboard/wallet?payment=cancelled`;

  const session = await (await getStripe()).checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: { name: "Wallet Top-Up" },
        unit_amount: body.amount_cents,
      },
      quantity: 1,
    }],
    client_reference_id: agencyId,
    metadata: { agency_id: agencyId },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  await payments.create({
    agency_id: agencyId,
    stripe_session_id: session.id,
    amount_cents: body.amount_cents,
  });

  return ok({ url: session.url, sessionId: session.id });
}, { resource: "wallet", action: "recharge" });
