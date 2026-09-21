-- 0059: app.payments was missing agent_id + plan_id even though the wallet
-- checkout routes and the Stripe webhook have read/written them since the
-- agent top-up flow shipped — agent top-ups 500'd live with
-- 'column "agent_id" of relation "payments" does not exist'.
-- Idempotent. Nullable FKs: pool top-ups carry neither.
ALTER TABLE app.payments ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES app.agents(id);
ALTER TABLE app.payments ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES app.agent_plans(id);
CREATE INDEX IF NOT EXISTS payments_agent_idx ON app.payments(agent_id) WHERE agent_id IS NOT NULL;
