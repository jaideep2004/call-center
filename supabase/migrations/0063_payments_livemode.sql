-- 0063: track Stripe mode per payment so the admin Payments page can show
-- live money only. livemode mirrors Stripe's session.livemode. Existing rows
-- predate test mode and were real charges (incl. the Sept-22 $1) → default true.
-- Idempotent.
ALTER TABLE app.payments ADD COLUMN IF NOT EXISTS livemode boolean NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS payments_livemode_idx ON app.payments (livemode, created_at DESC);
