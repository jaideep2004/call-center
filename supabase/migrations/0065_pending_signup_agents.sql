-- 0066: pending-at-signup agents. A fresh signup has no membership and no
-- agency, but must still appear in Admin -> Agents as pending (approval first,
-- agency later). Links the row to the login identity directly.
-- Idempotent.
ALTER TABLE app.agents ADD COLUMN IF NOT EXISTS user_id text REFERENCES "user"(id);
ALTER TABLE app.agents ALTER COLUMN agency_id DROP NOT NULL;
ALTER TABLE app.agents ALTER COLUMN membership_id DROP NOT NULL;
ALTER TABLE app.agents ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS agents_user_idx ON app.agents (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS agents_approval_idx ON app.agents (approval_status) WHERE deleted_at IS NULL;
