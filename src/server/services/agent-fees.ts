import { query, transaction } from "@/server/db";
import { agentFees } from "@/server/repositories/agent-fees";

interface FeeCandidate {
  id: string;
  agency_id: string;
  software_fee_cents: number;
  plan_price_cents: number | null;
}

/**
 * Monthly fee generation (client Q3/Q5):
 * - Postpaid agents (active plan subscription): "Dialer Fee" = plan price (adjustable per plan).
 * - Prepaid agents (no active plan): "Software Access" = agent.software_fee_cents (adjustable per agent).
 * Idempotent per (agent, kind, due month) via the unique constraint.
 */
export async function generateMonthlyFees(dueDate: Date = new Date()): Promise<{ generated: number; skipped: number }> {
  const due = dueDate.toISOString().slice(0, 10);

  const rows = await query<FeeCandidate>(
    `SELECT a.id, a.agency_id, a.software_fee_cents,
            (SELECT p.price_cents
             FROM app.agent_subscriptions s
             JOIN app.agent_plans p ON p.id = s.plan_id
             WHERE s.agent_id = a.id AND s.status = 'active'
               AND (s.end_date IS NULL OR s.end_date > now())
               AND s.calls_used < p.call_allowance
             ORDER BY s.created_at DESC LIMIT 1) AS plan_price_cents
     FROM app.agents a`,
  );

  let generated = 0;
  let skipped = 0;
  for (const a of rows) {
    const isPostpaid = a.plan_price_cents != null;
    const kind = isPostpaid ? "dialer" : "software";
    const amount = isPostpaid ? a.plan_price_cents! : a.software_fee_cents;
    if (amount <= 0) { skipped++; continue; }
    const row = await agentFees.ensureMonthlyFee({
      agent_id: a.id,
      agency_id: a.agency_id,
      kind,
      amount_cents: amount,
      due_date: due,
    });
    if (row) generated++;
    else skipped++;
  }
  return { generated, skipped };
}

/**
 * Weekly invoice generation (client Q6): every Monday, roll all fees due in
 * the last 7 days into ONE pending invoice per agency (call_id NULL). The
 * admin reviews the invoice and manually sends it to the agency.
 * Idempotent: fees already attached to an invoice are skipped.
 */
export async function generateWeeklyInvoices(sinceDate: Date = new Date(Date.now() - 7 * 86400_000)): Promise<{
  invoices: number;
  feesIncluded: number;
}> {
  const since = sinceDate.toISOString().slice(0, 10);
  const dueFees = await query<{ id: string; agency_id: string; amount_cents: number }>(
    `SELECT id, agency_id, amount_cents
     FROM app.agent_fees
     WHERE status = 'pending' AND invoice_id IS NULL AND due_date >= $1`,
    [since],
  );

  const byAgency = new Map<string, { ids: string[]; total: number }>();
  for (const f of dueFees) {
    const agg = byAgency.get(f.agency_id) ?? { ids: [], total: 0 };
    agg.ids.push(f.id);
    agg.total += f.amount_cents;
    byAgency.set(f.agency_id, agg);
  }

  let invoices = 0;
  let feesIncluded = 0;
  for (const [agencyId, agg] of byAgency) {
    await transaction(async (client) => {
      const invoice = await client.query<{ id: string }>(
        `INSERT INTO app.invoices (agency_id, call_id, total_cents, currency, status)
         VALUES ($1, NULL, $2, 'USD', 'pending')
         RETURNING id`,
        [agencyId, agg.total],
      );
      await client.query(
        `UPDATE app.agent_fees SET invoice_id = $2, updated_at = now()
         WHERE id = ANY($1::uuid[]) AND invoice_id IS NULL`,
        [agg.ids, invoice.rows[0].id],
      );
      invoices++;
      feesIncluded += agg.ids.length;
    });
  }
  return { invoices, feesIncluded };
}
