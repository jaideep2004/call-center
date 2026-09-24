-- 0062: finalize the three-role model at the type level.
-- 0057 remapped every row (super_admin->admin, agency/manager/finance->agent)
-- but ALTER TYPE .. DROP VALUE is rejected on managed Postgres (0A000), so
-- the dead labels lingered. Rebuild the enum instead: only app.memberships
-- uses it, and the guard below makes this a no-op where already clean.
-- Idempotent.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'role_name' AND e.enumlabel NOT IN ('admin', 'agent', 'publisher')
  ) THEN
    IF EXISTS (
      SELECT 1 FROM app.memberships WHERE role::text NOT IN ('admin', 'agent', 'publisher')
    ) THEN
      RAISE EXCEPTION 'legacy membership roles remain — run 0057 first';
    END IF;
    CREATE TYPE app.role_name_new AS ENUM ('admin', 'agent', 'publisher');
    ALTER TABLE app.memberships ALTER COLUMN role TYPE app.role_name_new USING role::text::app.role_name_new;
    DROP TYPE app.role_name;
    ALTER TYPE app.role_name_new RENAME TO role_name;
  END IF;
END
$$;
