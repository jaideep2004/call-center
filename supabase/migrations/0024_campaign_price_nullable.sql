-- Campaign price is optional: synced Retreaver campaigns have no buyer price until
-- the admin sets one (real money comes from call records via revenue_cents).
alter table app.campaigns alter column price_cents drop not null;
