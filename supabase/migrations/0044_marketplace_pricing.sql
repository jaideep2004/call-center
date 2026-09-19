-- 0044: Marketplace pricing — per-offer buyer price is campaigns.price_cents (exists),
-- add per-offer publisher payout caps + default/exclusive visibility.
-- Client: Medicare $10-20 / FE $35-50 adjustable; each campaign owns its max payout.

alter table app.campaigns
  add column if not exists max_publisher_payout_cents int,
  add column if not exists min_publisher_payout_cents int,
  add column if not exists visibility text not null default 'default',
  add column if not exists is_exclusive boolean not null default false;

-- guard visibility values (default = open to all, exclusive = restricted via campaign_assignments)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'campaigns_visibility_check') then
    alter table app.campaigns
      add constraint campaigns_visibility_check check (visibility in ('default', 'exclusive'));
  end if;
end $$;

-- guard payout sanity: max >= min when both set, both >= 0
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'campaigns_payout_range_check') then
    alter table app.campaigns
      add constraint campaigns_payout_range_check check (
        (max_publisher_payout_cents is null or max_publisher_payout_cents >= 0)
        and (min_publisher_payout_cents is null or min_publisher_payout_cents >= 0)
        and (
          max_publisher_payout_cents is null
          or min_publisher_payout_cents is null
          or max_publisher_payout_cents >= min_publisher_payout_cents
        )
      );
  end if;
end $$;

create index if not exists campaigns_status_visibility_idx
  on app.campaigns(status, visibility);
