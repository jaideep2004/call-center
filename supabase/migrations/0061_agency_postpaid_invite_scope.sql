-- 0061: agency-level postpaid + scoped recruitment invites.
-- postpaid_bypass: members of a postpaid agency take calls without prepay
-- (funding gate + routing treat them like subscription/postpaid agents).
-- Admin-only to set: heads must never grant themselves a money bypass.
-- recruitment_invites.agency_id: lets a platform admin invite agents into a
-- SPECIFIC agency (previously invites always joined the inviter's agency).
-- Idempotent.
ALTER TABLE app.agencies ADD COLUMN IF NOT EXISTS postpaid_bypass boolean NOT NULL DEFAULT false;
ALTER TABLE app.recruitment_invites ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES app.agencies(id);
