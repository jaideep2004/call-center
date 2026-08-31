alter table app.scripts add column if not exists campaign_id uuid references app.campaigns(id);

create index scripts_campaign_idx on app.scripts(campaign_id);
