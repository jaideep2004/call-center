-- 0070: close the RLS gaps Supabase flags (and our own new table).
-- The app talks to Postgres as the table owner (direct pool + service key
-- for Storage), so enabling RLS changes nothing at runtime: it only denies
-- the anon/authenticated PostgREST roles, which must never read these
-- tables directly. No policies = deny-by-default. Idempotent.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'app.campaign_assignments',
    'app.payment_reversals',
    'app.subscription_call_charges',
    'app.system_settings',
    'app.tracking_clicks',
    'app.wallet_transfers',
    'public.account',
    'public.session',
    'public."user"',
    'public.verification',
    'public.schema_migrations'
  ] LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
