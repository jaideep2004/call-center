-- Phase 4.2.3: agent notes attached to calls (softphone dialer popup)
CREATE TABLE IF NOT EXISTS app.call_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES app.calls(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES app.agents(id) ON DELETE SET NULL,
  agency_id uuid REFERENCES app.agencies(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS call_notes_call_id_idx ON app.call_notes(call_id);
CREATE INDEX IF NOT EXISTS call_notes_agency_id_idx ON app.call_notes(agency_id);
CREATE INDEX IF NOT EXISTS call_notes_created_at_idx ON app.call_notes(created_at DESC);
ALTER TABLE app.call_notes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='app' AND tablename='call_notes' AND policyname='allow_all') THEN
    CREATE POLICY allow_all ON app.call_notes FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
