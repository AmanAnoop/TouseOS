-- ClubOS: organization served + service type on hour entries

ALTER TABLE club_service_hours
  ADD COLUMN IF NOT EXISTS organization_served TEXT,
  ADD COLUMN IF NOT EXISTS service_type TEXT;
