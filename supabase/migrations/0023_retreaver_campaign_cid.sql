-- 5A: Map Retreaver campaign id (cid) to our campaign for call attribution.
-- One-way reference: Retreaver owns the intake side, we own ops. cid is the join key.
alter table app.campaigns add column if not exists retreaver_cid text;
create index if not exists campaigns_retreaver_cid_idx on app.campaigns(retreaver_cid) where retreaver_cid is not null;
