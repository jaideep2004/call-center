import { NextResponse } from "next/server";
import { getStripe, getWebhookSecret } from "@/server/stripe";
import { payments } from "@/server/repositories/payments";
import { walletEntries, agentSubscriptions } from "@/server/repositories";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const sig = request.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing stripe-signature" }, { status: 401 });

  let webhookSecret: string;
  let event;
  try {
    webhookSecret = await getWebhookSecret();
    const payload = await request.text();
    event = (await getStripe()).webhooks.constructEvent(payload, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      id: string;
      payment_intent: string | null;
      metadata: Record<string, string>;
      amount_total: number | null;
    };

    if (session.metadata?.type === "agent_wallet_topup") {
      const payment = await payments.findBySessionId(session.id);
      if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
      if (payment.status === "completed") return NextResponse.json({ received: true });

      const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : "";
      const amountCents = session.amount_total ?? payment.amount_cents;

      await payments.markCompleted(payment.id, paymentIntentId);

      await walletEntries.create({
        agency_id: payment.agency_id,
        agent_id: payment.agent_id ?? undefined,
        type: "top_up",
        amount_cents: amountCents,
        currency: payment.currency,
        idempotency_key: `stripe_${session.id}`,
        provider_reference: paymentIntentId,
      });
    } else if (session.metadata?.type === "subscription") {
      const agentId = session.metadata.agent_id;
      const planId = session.metadata.plan_id;
      const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : "";

      const payment = await payments.findBySessionId(session.id);
      if (payment && payment.status !== "completed") {
        await payments.markCompleted(payment.id, paymentIntentId);
      }

      const existing = await agentSubscriptions.findActiveByAgent(agentId);
      if (!existing) {
        try {
          await agentSubscriptions.create({
            agent_id: agentId,
            plan_id: planId,
            auto_renew: false,
          });
        } catch (error: any) {
          // Race: duplicate webhook delivery created the active subscription
          // first. The unique partial index (migration 0029) makes the second
          // insert a conflict — treat as success.
          const isUniqueViolation = error?.code === "23505";
          if (!isUniqueViolation) throw error;
        }
      }
    } else {
      const payment = await payments.findBySessionId(session.id);
      if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
      if (payment.status === "completed") return NextResponse.json({ received: true });

      const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : "";
      const amountCents = session.amount_total ?? payment.amount_cents;

      await payments.markCompleted(payment.id, paymentIntentId);

      await walletEntries.create({
        agency_id: payment.agency_id,
        type: "top_up",
        amount_cents: amountCents,
        currency: payment.currency,
        idempotency_key: `stripe_${session.id}`,
        provider_reference: paymentIntentId,
      });
    }
  }

  return NextResponse.json({ received: true });
}
