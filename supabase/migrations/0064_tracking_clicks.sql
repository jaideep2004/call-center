-- 0064: publisher tracking-link clicks. The /t/[afid] click-to-call page logs
-- every visit here so publishers see click stats next to call stats.
-- No PII: only publisher + campaign + time (+ optional referrer host).
-- Idempotent.
CREATE TABLE IF NOT EXISTS app.tracking_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher_id uuid NOT NULL REFERENCES app.publishers(id),
  campaign_id uuid NOT NULL REFERENCES app.campaigns(id),
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tracking_clicks_publisher_idx
  ON app.tracking_clicks (publisher_id, created_at DESC);
CREATE INDEX IF NOT EXISTS tracking_clicks_campaign_idx
  ON app.tracking_clicks (campaign_id, created_at DESC);
