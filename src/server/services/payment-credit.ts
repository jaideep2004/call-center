import { payments, type PaymentRow } from "@/server/repositories/payments";
import { walletEntries, agencyWallets, agentSubscriptions } from "@/server/repositories";
import { transaction } from "@/server/db";

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
 * Credit a pending top-up payment exactly once. Everything lands in ONE
 * database transaction (ledger and/or pool + status flip), so a crash can
 * never strand a half-credited payment: redelivery either retries cleanly
 * (rolled back) or sees `completed` and skips. The UNIQUE ledger key is the
 * second line of defense for concurrent doubles. Returns true only when this
 * call performed the credit (receipts key off this — no double mail).
 *
 * Single-pot rule: an agency-pool top-up credits ONLY the pool balance (plus
 * the payments audit row). Writing an agency-ledger top_up for the same cents
 * would make one Stripe payment spendable twice (transfers + allocations).
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
  await transaction(async (client) => {
    // Re-check under a row lock: the pre-txn object above is stale under
    // concurrency (webhook + reconcile hitting together both saw pending).
    // The pool path has no unique ledger key, so this lock is its ONLY
    // double-credit defense — never remove it.
    const fresh = await client.query(`SELECT status FROM app.payments WHERE id = $1 FOR UPDATE`, [payment.id]);
    if ((fresh.rows[0] as { status?: string } | undefined)?.status === "completed") {
      duplicate = true;
      return;
    }
    try {
      if (kind === "agency-pool") {
        await agencyWallets.creditPool(payment.agency_id, payment.amount_cents, client);
      } else if (kind === "agent") {
        await walletEntries.create({
          agency_id: payment.agency_id,
          agent_id: payment.agent_id ?? undefined,
          type: "top_up",
          amount_cents: payment.amount_cents,
          currency: payment.currency,
          idempotency_key: key,
          provider_reference: paymentIntentId,
        }, client);
      } else {
        await walletEntries.create({
          agency_id: payment.agency_id,
          type: "top_up",
          amount_cents: payment.amount_cents,
          currency: payment.currency,
          idempotency_key: key,
          provider_reference: paymentIntentId,
        }, client);
      }
    } catch (e: any) {
      if (e?.code !== "23505") throw e;
      // Duplicate key: a concurrent delivery already credited. Converge the
      // status below but report honestly — no second receipt goes out.
      duplicate = true;
    }
    await payments.markCompleted(payment.id, paymentIntentId, client);
  });
  if (duplicate) return { credited: false };
  // NOTE (client decision): no automatic Retreaver pause/unpause runs after
  // pool top-ups anymore. Campaigns stay exactly as a human left them.
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

export interface RefundReversal {
  /** Stripe refund/dispute id for idempotency (refund_<pi>_<id>). */
  reversalId: string;
  /** Cents to claw back (partial refunds supported). */
  amountCents: number;
  reason: string;
}

/**
 * Reverse a credited top-up after a Stripe refund / dispute withdrawal.
 * Mirrors creditTopupPayment per kind (agent ledger, agency ledger, pool
 * debit, subscription cancel) inside ONE transaction with the same
 * agency-funds lock + locked status re-check, so redelivered refund events
 * converge instead of double-reversing. Partial refunds reverse only the
 * refunded slice and leave the payment completed; full refunds flip it to
 * `refunded`. A shortfall (already spent) still reverses — the negative
 * balance is the honest debt signal — and is logged loudly for the admin.
 */
export async function reversePaymentCredit(
  payment: PaymentRow,
  reversal: RefundReversal,
): Promise<{ reversed: boolean; shortfall_cents: number }> {
  const key = `refund_${payment.stripe_payment_intent_id ?? payment.stripe_session_id}_${reversal.reversalId}`;
  let shortfall = 0;
  const res = await transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`agency-funds:${payment.agency_id}`]);
    const fresh = await client.query(`SELECT status FROM app.payments WHERE id = $1 FOR UPDATE`, [payment.id]);
    if ((fresh.rows[0] as { status?: string } | undefined)?.status === "refunded") {
      return { reversed: false };
    }
    // Idempotency anchor: redelivered refund/dispute events carry the same
    // reversal id and converge here instead of reversing twice.
    const marker = await client.query(
      `INSERT INTO app.payment_reversals (payment_id, reversal_key, amount_cents, reason)
        VALUES ($1, $2, $3, $4) ON CONFLICT (reversal_key) DO NOTHING RETURNING id`,
      [payment.id, key, Math.max(0, reversal.amountCents), reversal.reason],
    );
    if (marker.rows.length === 0) return { reversed: false };
    const amount = Math.max(0, Math.min(reversal.amountCents, payment.amount_cents));
    if (amount <= 0) return { reversed: false };

    if (payment.plan_id) {
      // Subscription money is revenue, not wallet funds: cancel the active
      // sub for this plan so no further calls ride on refunded money.
      if (payment.agent_id) {
        const subs = await agentSubscriptions.findByAgent(payment.agent_id);
        const active = subs.find((s) => s.plan_id === payment.plan_id && s.status === "active");
        if (active) {
          await agentSubscriptions.update(active.id, { status: "cancelled" });
        }
      }
    } else if (payment.agent_id) {
      await walletEntries.create({
        agency_id: payment.agency_id,
        agent_id: payment.agent_id,
        type: "refund",
        amount_cents: -amount,
        currency: payment.currency,
        provider_reference: reversal.reversalId,
        idempotency_key: key,
      }, client);
    } else {
      // Agency-level: pool top-ups debit the pool, ledger top-ups reverse
      // the agency ledger. Pool leaves no ledger row, so probe for the
      // original stripe_* top_up entry to tell them apart.
      const originals = await client.query(
        `SELECT id, type FROM app.wallet_entries WHERE idempotency_key = $1`,
        [`stripe_${payment.stripe_session_id}`],
      );
      if ((originals.rows as unknown[]).length > 0) {
        await walletEntries.create({
          agency_id: payment.agency_id,
          type: "refund",
          amount_cents: -amount,
          currency: payment.currency,
          provider_reference: reversal.reversalId,
          idempotency_key: key,
        }, client);
      } else {
        await agencyWallets.debitPool(payment.agency_id, amount, client);
      }
    }

    if (reversal.amountCents >= payment.amount_cents) {
      await payments.markRefunded(payment.id, client);
    }
    return { reversed: true };
  });
  if (!res.reversed) return { reversed: false, shortfall_cents: 0 };

  // Debt signal: reversal pushed some balance negative — admin must see it.
  try {
    const [agencyBal, agentBal] = await Promise.all([
      walletEntries.sumByAgency(payment.agency_id),
      payment.agent_id ? walletEntries.sumByAgent(payment.agent_id) : Promise.resolve(0),
    ]);
    if (agencyBal < 0 || agentBal < 0) {
      shortfall = Math.min(agencyBal, agentBal);
      console.warn(JSON.stringify({
        event: "refund_shortfall",
        paymentId: payment.id.slice(0, 8),
        agencyBal,
        agentBal,
        reversalId: reversal.reversalId,
      }));
    }
  } catch { /* audit best-effort */ }
  return { reversed: true, shortfall_cents: shortfall };
}
