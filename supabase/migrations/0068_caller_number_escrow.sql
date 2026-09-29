-- 0068: encrypted caller-number escrow for post-buffer reveal.
-- Only the sha256 hash was stored, so numbers could never be shown after the
-- buffer. The raw number is now kept server-encrypted at inbound; APIs
-- decrypt it solely for entitled viewers (admin/head/assigned agent) once
-- connectedSeconds >= campaign buffer_seconds. Nullable: old rows predate it
-- and stay masked. Idempotent.
ALTER TABLE app.calls ADD COLUMN IF NOT EXISTS caller_number_encrypted text;
