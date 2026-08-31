-- Phase 4.3: onboarding calendar — slots agents can book after signup
CREATE TABLE IF NOT EXISTS app.onboarding_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES app.agencies(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  capacity int NOT NULL DEFAULT 1 CHECK (capacity > 0 AND capacity <= 100),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES app.memberships(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT onboarding_slots_time_chk CHECK (end_time > start_time)
);
CREATE INDEX IF NOT EXISTS onboarding_slots_date_idx ON app.onboarding_slots(date);
CREATE INDEX IF NOT EXISTS onboarding_slots_agency_idx ON app.onboarding_slots(agency_id);
CREATE INDEX IF NOT EXISTS onboarding_slots_active_idx ON app.onboarding_slots(is_active) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS app.onboarding_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL REFERENCES app.onboarding_slots(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES app.agents(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES app.agencies(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(slot_id, agent_id)
);
CREATE INDEX IF NOT EXISTS onboarding_bookings_slot_idx ON app.onboarding_bookings(slot_id);
CREATE INDEX IF NOT EXISTS onboarding_bookings_agent_idx ON app.onboarding_bookings(agent_id);
CREATE INDEX IF NOT EXISTS onboarding_bookings_status_idx ON app.onboarding_bookings(status);

ALTER TABLE app.onboarding_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.onboarding_bookings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='app' AND tablename='onboarding_slots' AND policyname='allow_all') THEN
    CREATE POLICY allow_all ON app.onboarding_slots FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='app' AND tablename='onboarding_bookings' AND policyname='allow_all') THEN
    CREATE POLICY allow_all ON app.onboarding_bookings FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
