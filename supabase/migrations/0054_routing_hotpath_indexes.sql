-- Phase 1.2: hot-path routing indexes.
-- phone_numbers(status, campaign_id) serves the spare-pool / assigned-phone
-- scans. Deliberately NO (e164, status) composite: e164 is already UNIQUE
-- (0001), so the single-row lookup + status filter is already index-fast —
-- a second index would be pure write overhead.
-- Plain CREATE INDEX (not CONCURRENTLY): the migration runner wraps files in
-- a transaction, which CONCURRENTLY forbids (see 0042 surgery notes).
CREATE INDEX IF NOT EXISTS idx_phone_numbers_status_campaign
  ON app.phone_numbers(status, campaign_id);
