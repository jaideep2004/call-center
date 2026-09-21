-- Phase 4 (point 3): the Stripe processing fee passed to users must be
-- auditable per payment. fee_cents = what the user paid above the credited
-- amount (payments.amount_cents stays the NET wallet credit). Legacy rows
-- keep fee_cents = 0 (platform absorbed the fee before this change).
-- Idempotent.
ALTER TABLE app.payments ADD COLUMN IF NOT EXISTS fee_cents bigint NOT NULL DEFAULT 0;
