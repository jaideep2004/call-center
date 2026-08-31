-- Recordings: persist provider + recording id so download URLs can be
-- re-signed on demand (Telnyx presigned URLs expire after 10 minutes).
ALTER TABLE app.recordings
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'telnyx',
  ADD COLUMN IF NOT EXISTS provider_recording_id TEXT;

-- Backfill provider references for existing rows from their recording events.
UPDATE app.recordings r
SET provider = c.provider,
    provider_recording_id = e.raw_redacted->'data'->'payload'->>'recording_id'
FROM app.calls c, app.call_events e
WHERE r.call_id = c.id
  AND e.call_id = c.id
  AND e.raw_redacted->'data'->>'event_type' = 'call.recording.saved'
  AND r.provider_recording_id IS NULL;