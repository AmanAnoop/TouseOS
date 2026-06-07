-- Batch 7: structured travel itinerary legs + trip-level subsidy

ALTER TABLE sports_travel_trips
  ADD COLUMN IF NOT EXISTS itinerary_legs JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS subsidy NUMERIC(12,2) NOT NULL DEFAULT 0;
