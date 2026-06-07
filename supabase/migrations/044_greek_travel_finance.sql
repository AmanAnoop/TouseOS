-- Greek travel location parity, per-member cost, payment linkage, coaching availability

ALTER TABLE greek_travel_trips
  ADD COLUMN IF NOT EXISTS venue_name TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS meeting_point TEXT,
  ADD COLUMN IF NOT EXISTS cost_per_member NUMERIC(12,2);

ALTER TABLE payment_items
  ADD COLUMN IF NOT EXISTS greek_trip_id UUID REFERENCES greek_travel_trips(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payment_items_greek_trip
  ON payment_items(greek_trip_id) WHERE greek_trip_id IS NOT NULL;

ALTER TABLE coaching_notes
  ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES member_profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_coaching_notes_availability
  ON coaching_notes(org_id, member_id, note_type)
  WHERE member_id IS NOT NULL;
