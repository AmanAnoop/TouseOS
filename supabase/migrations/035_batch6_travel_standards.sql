-- Batch 6: travel charge linkage + standards appeals metadata

ALTER TABLE payment_items
  ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES sports_travel_trips(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payment_items_trip ON payment_items(trip_id) WHERE trip_id IS NOT NULL;

ALTER TABLE standards_cases
  ADD COLUMN IF NOT EXISTS appeal_notes TEXT,
  ADD COLUMN IF NOT EXISTS appealed_at TIMESTAMPTZ;
