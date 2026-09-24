import { payments, type PaymentRow } from "@/server/repositories/payments";
import { walletEntries, agencyWallets } from "@/server/repositories";

export type TopupKind = "agent" | "agency-pool" | "agency";

export interface StripeTopupSession {
  id: string;
  payment_intent?: string | null;
  metadata?: Record<string, string> | null;
  amount_total?: number | null;
  livemode?: boolean | null;
}

function parseCents(v: string | undefined): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/**
 * Find the payments row for a Stripe session, creating it from session
 * metadata when checkout died between session creation and row insert.
 *
 * This is the Sept-22 $1 hole: Stripe recorded the payment but the app had
 * no row, so the webhook 404d and the wallet was never credited. An orphan
 * session carrying full top-up metadata now heals itself instead of dying.
 * Returns null only when the metadata cannot describe a top-up (then the
 * caller 404s as before).
 */
export async function findOrCreateTopupPayment(
  session: StripeTopupSession,
): Promise<{ payment: PaymentRow; kind: TopupKind } | null> {
  const existing = await payments.findBySessionId(session.id);
  if (existing) {
    // Confirm the mode from Stripe truth (rows created before livemode
    // tracking, or mode switches mid-flight, get corrected here).
    if (session.livemode != null && session.livemode !== existing.livemode) {
      await payments.setLivemode(session.id, session.livemode).catch(() => {});
      existing.livemode = session.livemode;
    }
    const kind: TopupKind =
      session.metadata?.type === "agent_wallet_topup" || existing.agent_id != null
        ? "agent"
        : session.metadata?.type === "agency_wallet_topup"
          ? "agency-pool"
          : "agency";
    return { payment: existing, kind };
  }
  const meta = session.metadata ?? {};
  const agencyId = meta.agency_id;
  const creditCents = parseCents(meta.credit_cents);
  if (!agencyId || creditCents == null) return null;
  const feeCents = parseCents(meta.fee_cents) ?? 0;
  if (meta.type === "agent_wallet_topup") {
    if (!meta.agent_id) return null;
    try {
      const payment = await payments.create({
        agency_id: agencyId,
        agent_id: meta.agent_id,
        stripe_session_id: session.id,
        amount_cents: creditCents,
        fee_cents: feeCents,
        livemode: session.livemode ?? true,
      });
      return { payment, kind: "agent" };
    } catch (e: any) {
      // Concurrent webhook/reconcile both healing the same orphan: the loser
      // re-reads the winner's row instead of 500ing into a retry storm.
      if (e?.code !== "23505") throw e;
      const winner = await payments.findBySessionId(session.id);
      return winner ? { payment: winner, kind: "agent" } : null;
    }
  }
  if (meta.type === "agency_wallet_topup" || meta.type == null || meta.type === "") {
    try {
      const payment = await payments.create({
        agency_id: agencyId,
        stripe_session_id: session.id,
        amount_cents: creditCents,
        fee_cents: feeCents,
        livemode: session.livemode ?? true,
      });
      return { payment, kind: meta.type === "agency_wallet_topup" ? "agency-pool" : "agency" };
    } catch (e: any) {
      if (e?.code !== "23505") throw e;
      const winner = await payments.findBySessionId(session.id);
      if (!winner) return null;
      const kind: TopupKind =
        meta.type === "agency_wallet_topup" ? "agency-pool" : winner.agent_id != null ? "agent" : "agency";
      return { payment: winner, kind };
    }
  }
  return null;
}

/**
 * Credit a pending top-up payment exactly once. Wallet-first ordering: the
 * ledger entry (UNIQUE idempotency_key) lands before the status flip, so a
 * crash between the two can never strand a `completed` payment with no
 * credit — redelivery sees the duplicate key and converges instead of
 * double-minting. Returns true when this call performed the credit.
 */
export async function creditTopupPayment(
  payment: PaymentRow,
  kind: TopupKind,
  paymentIntentId: string,
  sessionId: string = payment.stripe_session_id,
): Promise<{ credited: boolean }> {
  if (payment.status === "completed") return { credited: false };
  const key = `stripe_${sessionId}`;
  let duplicate = false;
  try {
    if (kind === "agent") {
      await walletEntries.create({
        agency_id: payment.agency_id,
        agent_id: payment.agent_id ?? undefined,
        type: "top_up",
        amount_cents: payment.amount_cents,
        currency: payment.currency,
        idempotency_key: key,
        provider_reference: paymentIntentId,
      });
    } else {
      await walletEntries.create({
        agency_id: payment.agency_id,
        type: "top_up",
        amount_cents: payment.amount_cents,
        currency: payment.currency,
        idempotency_key: key,
        provider_reference: paymentIntentId,
      });
      if (kind === "agency-pool") {
        await agencyWallets.creditPool(payment.agency_id, payment.amount_cents);
      }
    }
  } catch (e: any) {
    if (e?.code !== "23505") throw e;
    // Duplicate key: a concurrent delivery already credited. Converge the
    // status below but report honestly — no second receipt goes out.
    duplicate = true;
  }
  await payments.markCompleted(payment.id, paymentIntentId);
  if (duplicate) return { credited: false };
  if (kind === "agency-pool") {
    const { syncOfferWalletPauses } = await import("@/server/services/offer-wallet-sync");
    void syncOfferWalletPauses(payment.agency_id).catch((e) =>
      console.warn(`[payment-credit] post-credit sync failed: ${String(e).slice(0, 160)}`),
    );
  }
  // Receipt to the agent + copy to the head. Best-effort, never blocks.
  const { sendWalletTopup } = await import("@/server/services/action-emails");
  void sendWalletTopup({
    agencyId: payment.agency_id,
    agentId: kind === "agent" ? payment.agent_id : null,
    amountCents: payment.amount_cents,
    feeCents: payment.fee_cents,
  }).catch(() => {});
  return { credited: true };
}
