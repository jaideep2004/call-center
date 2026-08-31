import { apiHandler, ok, fail } from "@/server/api-utils";
import { dispositions, dispositionPayouts, calls, agencies } from "@/server/repositories";
import { transaction } from "@/server/db";

export const PATCH = apiHandler(async (req, { params, membership, agencyId, user }) => {
  const { id } = await params;
  if (!membership) return fail("Admin membership required", 403);
  const scope = agencyId ?? undefined;
  if (!scope && !["super_admin", "admin"].includes(user?.role ?? "")) return fail("Agency scope required", 403);

  const disposition = scope
    ? await dispositions.findByIdForAgency(id, scope)
    : await dispositions.findById(id).catch(() => null);
  if (!disposition) return fail("Disposition not found", 404);
  if (disposition.admin_confirmed) return fail("Already confirmed", 409);

  const call = await calls.findById(disposition.call_id, scope);
  if (!call) return fail("Call not found", 404);

  const payouts = await dispositionPayouts.findByAgency(call.agency_id);
  const payout = payouts.find((p) => p.outcome === disposition.outcome);
  const amountCents = payout?.amount_cents ?? 0;

  const callAgency = await agencies.findById(call.agency_id);
  const parentAgencyId = callAgency?.parent_agency_id ?? null;
  const commissionRate = callAgency?.commission_rate ?? 0;
  const commissionCents = parentAgencyId ? Math.floor(amountCents * commissionRate / 100) : 0;

  const result = await transaction(async (client) => {
    await client.query(
      `UPDATE app.dispositions
       SET admin_confirmed = true, confirmed_by = $2, confirmed_at = now(), updated_at = now()
       WHERE id = $1`,
      [id, membership.id],
    );

    await client.query(
      `INSERT INTO app.invoices (agency_id, call_id, total_cents, currency, status)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (call_id) DO UPDATE SET total_cents = EXCLUDED.total_cents, status = EXCLUDED.status
       RETURNING *`,
      [call.agency_id, call.id, amountCents, "USD", "paid"],
    );

    if (amountCents > 0) {
      await client.query(
        `INSERT INTO app.wallet_entries (agency_id, type, amount_cents, currency, call_id, provider_reference, idempotency_key)
         VALUES ($1, $2::app.ledger_type, $3, $4, $5, $6, $7)
         ON CONFLICT (idempotency_key) DO NOTHING`,
        [call.agency_id, "disposition_payout", amountCents, "USD", call.id, `disposition_${id}`, `payout_${id}`],
      );
    }

    if (commissionCents > 0) {
      await client.query(
        `INSERT INTO app.wallet_entries (agency_id, type, amount_cents, currency, call_id, provider_reference, idempotency_key)
         VALUES ($1, $2::app.ledger_type, $3, $4, $5, $6, $7)
         ON CONFLICT (idempotency_key) DO NOTHING`,
        [parentAgencyId, "disposition_payout", commissionCents, "USD", call.id, `commission_${id}`, `commission_${id}`],
      );
    }

    return { amountCents, commissionCents };
  });

  return ok({ disposition_id: id, payout_cents: amountCents, commission_cents: commissionCents }, "Disposition confirmed");
}, { resource: "calls", action: "manage" });
