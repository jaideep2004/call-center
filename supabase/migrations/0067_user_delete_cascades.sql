-- 0067: deleting a login must not strand agent/publisher rows.
-- Deleting a "user" row directly in the DB previously orphaned app.agents
-- (e.g. AG-0004 kept listing after its login was deleted) and left
-- app.memberships behind, because only the API hard-delete cleaned them.
-- After this: pending agent rows vanish with the login, publisher business
-- rows are unlinked (never destroyed), and memberships cascade too.
-- All three constraints are NOT VALID so pre-existing orphans never block
-- the migration: remove leftovers once via Agents -> Delete (or the
-- API hard-delete), and every future delete cascades. Idempotent.
ALTER TABLE app.agents DROP CONSTRAINT IF EXISTS agents_user_id_fkey;
ALTER TABLE app.agents ADD CONSTRAINT agents_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE app.publishers DROP CONSTRAINT IF EXISTS publishers_user_id_fkey;
ALTER TABLE app.publishers ADD CONSTRAINT publishers_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE SET NULL NOT VALID;

-- memberships.user_id was plain text with no FK at all: constrain it now.
ALTER TABLE app.memberships DROP CONSTRAINT IF EXISTS memberships_user_id_fkey;
ALTER TABLE app.memberships ADD CONSTRAINT memberships_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE NOT VALID;

-- NOTE: agents keyed by membership_id stay RESTRICT-guarded on purpose —
-- a login that owns call/wallet history still cannot be silently wiped
-- (direct delete fails loudly; use Suspend instead).
