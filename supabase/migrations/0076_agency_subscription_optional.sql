-- 0076: per-agency subscription requirement for Go Online.
-- Default (true) preserves current behavior: agents need BOTH an active plan
-- subscription AND a funded wallet. Setting false lets a funded wallet alone
-- (personal top-up or pool allocation) unlock Go Online — for agencies whose
-- buyers fund agents directly without plans.
-- Idempotent.
ALTER TABLE app.agencies ADD COLUMN IF NOT EXISTS require_subscription_for_online boolean NOT NULL DEFAULT true;
