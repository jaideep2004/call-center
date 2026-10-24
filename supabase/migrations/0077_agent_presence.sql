-- 0077: heartbeat-backed agent presence.
-- availability alone is a client-set flag: a closed tab, killed browser, or
-- lost network left agents 'available' forever (observed: 3 rows stale for
-- 8 days), so dashboards showed phantom online agents and routing could ring
-- them. presence_seen_at is refreshed by the dashboard heartbeat, and every
-- online count/routing query only trusts a stamp newer than 180 seconds.
--
-- Existing online rows start with a fresh stamp so the deploy itself does not
-- cut off agents whose tabs are still alive; rows that are no longer beating
-- age out automatically (and the 30s maintenance sweep flips them offline).
-- Idempotent: the backfill only touches rows that never had a stamp.
ALTER TABLE app.agents ADD COLUMN IF NOT EXISTS presence_seen_at timestamptz;

UPDATE app.agents
   SET presence_seen_at = now()
 WHERE availability = 'available'
   AND presence_seen_at IS NULL;
