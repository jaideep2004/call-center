import { NextResponse } from "next/server";
import { getStripe, getWebhookSecret } from "@/server/stripe";
import { payments } from "@/server/repositories/payments";
import { agentSubscriptions } from "@/server/repositories";
import { creditTopupPayment, findOrCreateTopupPayment } from "@/server/services/payment-credit";

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
      livemode: boolean | null;
    };

    if (session.metadata?.type === "agent_wallet_topup") {
      const found = await findOrCreateTopupPayment({
        id: session.id,
        payment_intent: session.payment_intent,
        metadata: session.metadata,
        amount_total: session.amount_total,
        livemode: session.livemode,
      });
      if (!found) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

      const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : "";
      // Phase 4 (point 3): credit the NET amount (payment.amount_cents).
      // session.amount_total is the gross (credit + 3% fee) — crediting it
      // would mint the fee into the wallet. Legacy rows (fee_cents=0) have
      // amount_cents == amount_total, so behavior there is unchanged.
      await creditTopupPayment(found.payment, "agent", paymentIntentId, session.id);
    } else if (session.metadata?.type === "agency_wallet_topup") {
      // P1.4 agency pool top-up: same idempotency contract as the agent
      // branch (payments.status guard + stripe_session idempotency key).
      const found = await findOrCreateTopupPayment({
        id: session.id,
        payment_intent: session.payment_intent,
        metadata: session.metadata,
        amount_total: session.amount_total,
        livemode: session.livemode,
      });
      if (!found) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

      const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : "";
      // Phase 4 (point 3): credit the NET amount (payment.amount_cents).
      // session.amount_total is the gross (credit + 3% fee) — crediting it
      // would mint the fee into the wallet. Legacy rows (fee_cents=0) have
      // amount_cents == amount_total, so behavior there is unchanged.
      await creditTopupPayment(found.payment, "agency-pool", paymentIntentId, session.id);
    } else if (session.metadata?.type === "subscription") {
      const agentId = session.metadata.agent_id;
      const planId = session.metadata.plan_id;
      const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : "";
      // Malformed sessions must never 500 the webhook into a retry storm.
      if (!agentId || !planId) {
        console.warn(`[stripe-webhook] subscription session ${session.id} missing agent_id/plan_id — acknowledged without action`);
        return NextResponse.json({ received: true });
      }

      // Orphan heal (same hole top-ups had): a checkout that died after
      // session creation leaves no payments row — rebuild it from metadata
      // instead of activating invisibly. Also stamps livemode from truth.
      let payment = await payments.findBySessionId(session.id);
      if (!payment) {
        const meta = session.metadata;
        const credit = Number(meta.credit_cents);
        try {
          payment = await payments.create({
            agency_id: meta.agency_id,
            agent_id: agentId,
            plan_id: planId,
            stripe_session_id: session.id,
            amount_cents: Number.isInteger(credit) && credit >= 0 ? credit : (session.amount_total ?? 0),
            fee_cents: Number(meta.fee_cents) || 0,
            livemode: session.livemode ?? true,
          });
        } catch (e: unknown) {
          if ((e as { code?: string })?.code !== "23505") throw e;
          payment = await payments.findBySessionId(session.id);
          if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
        }
      } else if (session.livemode != null && session.livemode !== payment.livemode) {
        await payments.setLivemode(session.id, session.livemode).catch(() => {});
      }
      if (payment.status !== "completed") {
        await payments.markCompleted(payment.id, paymentIntentId);
      }

      const existing = await agentSubscriptions.findActiveByAgent(agentId);
      let createdNew = false;
      if (!existing) {
        try {
          await agentSubscriptions.create({
            agent_id: agentId,
            plan_id: planId,
            auto_renew: false,
          });
          createdNew = true;
        } catch (error: any) {
          // Race: duplicate webhook delivery created the active subscription
          // first. The unique partial index (migration 0029) makes the second
          // insert a conflict — treat as success WITHOUT re-mailing.
          const isUniqueViolation = error?.code === "23505";
          if (!isUniqueViolation) throw error;
        }
        // First activation only (never on redelivery/races): receipt to the
        // agent + copy to the head. Fully isolated — mail can never fail
        // the webhook.
        if (createdNew) {
          try {
            const [{ sendSubscriptionActive }, { agentPlans }, repos] = await Promise.all([
              import("@/server/services/action-emails"),
              import("@/server/repositories/agent-plans"),
              import("@/server/repositories"),
            ]);
            const plan = await agentPlans.findById(planId).catch(() => null);
            const agentRow = await repos.agents.findById(agentId).catch(() => null);
            void sendSubscriptionActive({
              agencyId: (agentRow as { agency_id?: string } | null)?.agency_id ?? "",
              agentId,
              planName: (plan as { name?: string } | null)?.name,
            }).catch(() => {});
          } catch {
            /* mail is best-effort */
          }
        }
      }
    } else {
      const found = await findOrCreateTopupPayment({
        id: session.id,
        payment_intent: session.payment_intent,
        metadata: session.metadata,
        amount_total: session.amount_total,
        livemode: session.livemode,
      });
      if (!found) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

      const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : "";
      // Phase 4 (point 3): credit the NET amount (payment.amount_cents).
      // session.amount_total is the gross (credit + 3% fee) — crediting it
      // would mint the fee into the wallet. Legacy rows (fee_cents=0) have
      // amount_cents == amount_total, so behavior there is unchanged.
      await creditTopupPayment(found.payment, found.kind, paymentIntentId, session.id);
    }
  }

  return NextResponse.json({ received: true });
}
