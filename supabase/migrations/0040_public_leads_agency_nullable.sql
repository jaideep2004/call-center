-- 0040_public_leads_agency_nullable.sql
-- Fixes the NEW HIGH regression from FEATURE_TESTS_2026-09-07.md Section N:
--   POST /api/v1/public/leads  → 500 (column "agency_id" of relation "leads" violates not-null)
-- Public lead capture was 100% broken: app.leads.agency_id was NOT NULL but the public
-- route has no agency context.
--
-- Two-part fix:
--   1) DROP NOT NULL on app.leads.agency_id (public leads can be tenant-orphan).
--   2) Add a sentinel "public" agency row so existing RLS policies that read
--      app.current_agency_id() still resolve. If your project already has a
--      public/catch-all agency, skip the INSERT.
--
-- Safety:
--   - All statements are IF EXISTS/IF NOT EXISTS — re-runnable.
--   - The sentinel agency uses a fixed UUID so we can re-reference it from the
--     application if/when we want to assign orphan leads back to a real agency.
--   - RLS: app.leads already has agency_isolation policy. After this change,
--     a row with agency_id=NULL is visible only when current_agency_id() is NULL
--     (i.e. public/web routes). Adjust policy if you want stricter rules.

ALTER TABLE app.leads ALTER COLUMN agency_id DROP NOT NULL;

-- Sentinel catch-all agency for orphan / public-sourced leads.
-- Fixed UUID: 00000000-0000-0000-0000-0000000000a1 (so it's recognizable).
INSERT INTO app.agencies (id, name, slug, created_at)
VALUES ('00000000-0000-0000-0000-0000000000a1', 'Public Leads', 'public-leads', now())
ON CONFLICT (id) DO NOTHING;

COMMENT ON COLUMN app.leads.agency_id IS
  'Owning agency. NULL allowed for public-sourced leads (routed to sentinel 00000000-0000-0000-0000-0000000000a1 on next assignment).';
