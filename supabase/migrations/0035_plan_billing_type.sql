ALTER TABLE app.agent_plans ADD COLUMN IF NOT EXISTS billing_type text NOT NULL DEFAULT 'prepaid' CHECK (billing_type IN ('prepaid','postpaid'));
CREATE INDEX IF NOT EXISTS agent_plans_billing_type_idx ON app.agent_plans(billing_type);
