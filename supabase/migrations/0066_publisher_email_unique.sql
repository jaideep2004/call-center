-- 0066: one contact email per publisher (case-insensitive, active rows only).
-- NULL emails (serial-only publishers) and soft-deleted rows are exempt.
-- Idempotent. NOTE: fails if live dupes already exist — merge them first
-- (keep the oldest row, move user_id/links, soft-delete the rest).
CREATE UNIQUE INDEX IF NOT EXISTS publishers_email_unique
  ON app.publishers (lower(email))
  WHERE email IS NOT NULL AND deleted_at IS NULL;
