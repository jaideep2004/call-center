-- Phase 5: three roles only (admin, agent, publisher). Remap every row
-- holding a removed role BEFORE the matching code deploys:
--   super_admin -> admin   (platform power consolidates on admin)
--   agency      -> agent   (heads are agents; headship lives in
--                          agencies.head_membership_id, elevated per-request)
--   manager     -> agent
--   finance     -> agent
-- Idempotent: WHERE clauses only match legacy values, safe to re-apply.
-- NOTE: dropping the dead enum labels is NOT here — ALTER TYPE .. DROP VALUE
-- cannot run inside a transaction block (which this runner uses). After this
-- migration is applied everywhere, run once via psql (each its own txn):
--   ALTER TYPE app.role_name DROP VALUE 'super_admin';
--   ALTER TYPE app.role_name DROP VALUE 'agency';
--   ALTER TYPE app.role_name DROP VALUE 'manager';
--   ALTER TYPE app.role_name DROP VALUE 'finance';
-- ("user".role is plain text — no enum change needed there.)
UPDATE "user" SET role = 'admin' WHERE role = 'super_admin';
UPDATE "user" SET role = 'agent' WHERE role IN ('agency', 'manager', 'finance');

UPDATE app.memberships SET role = 'admin' WHERE role = 'super_admin';
UPDATE app.memberships SET role = 'agent' WHERE role IN ('agency', 'manager', 'finance');
