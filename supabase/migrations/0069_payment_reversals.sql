-- 0069: idempotency ledger for Stripe refund/dispute reversals.
-- Pool top-ups leave no wallet_entries row, so redelivered refund webhooks
-- could debit the pool twice. One row per (payment, stripe reversal id):
-- the UNIQUE key makes concurrent/duplicate reversals converge.
-- Idempotent.
CREATE TABLE IF NOT EXISTS app.payment_reversals (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references app.payments(id) ON DELETE CASCADE,
  reversal_key text not null unique,
  amount_cents bigint not null check (amount_cents >= 0),
  reason text not null default '',
  created_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS payment_reversals_payment_idx ON app.payment_reversals(payment_id);
