-- 0071: contact phone for logins (registration form field).
-- Optional, user-managed. Shown to admins on the Users page.
-- Idempotent.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS phone_number text;
