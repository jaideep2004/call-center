-- 0072: campaign price 0-vs-NULL repair.
-- Root cause of `campaigns_price_cents_check` 500s when editing campaigns:
-- the 0001 CHECK (price_cents > 0) rejects 0, while API validation allowed
-- min(0) and the dashboard price input sent 0 for an empty field. Worse, the
-- CHECK is evaluated on EVERY row write, so once a row held 0, ANY edit to
-- that campaign (status, publishers, ...) failed with 23514.
-- Semantics going forward: NULL = unset (sync/seed default, routing falls
-- back to the effective bid), > 0 = real price. 0 is meaningless and rejected
-- at the API layer with a 422 before it can reach the DB.
-- Drop-then-repair-then-readd: the UPDATE cannot run under the old CHECK.

alter table app.campaigns drop constraint if exists campaigns_price_cents_check;

update app.campaigns set price_cents = null where price_cents = 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'campaigns_price_cents_check') then
    alter table app.campaigns
      add constraint campaigns_price_cents_check check (price_cents is null or price_cents > 0);
  end if;
end $$;
