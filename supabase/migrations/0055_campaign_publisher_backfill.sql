-- Phase 3.3: campaign_publishers join is the source of truth, but old rows
-- predate it (legacy campaigns.publisher_id used for reads). Backfill legacy
-- from the join ONLY where unambiguous (exactly one join row) and legacy is
-- NULL — never overwrite an explicit legacy value, never guess on multi-row
-- joins. Idempotent.
-- NOTE: publisher_id is uuid, and min()/max(uuid) do not exist in Postgres,
-- so the single join row is picked with array_agg instead.
UPDATE app.campaigns c
SET publisher_id = cp.publisher_id
FROM (
  SELECT campaign_id, (array_agg(publisher_id))[1] AS publisher_id
  FROM app.campaign_publishers
  GROUP BY campaign_id
  HAVING COUNT(*) = 1
) cp
WHERE c.id = cp.campaign_id
  AND c.publisher_id IS NULL;
