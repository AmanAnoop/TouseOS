-- SportsOS travel: structured location fields for trip planning

ALTER TABLE sports_travel_trips
  ADD COLUMN IF NOT EXISTS venue_name TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS departure_location TEXT,
  ADD COLUMN IF NOT EXISTS meeting_point TEXT;
