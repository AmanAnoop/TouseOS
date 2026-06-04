-- Saved venue/location presets for events and SportsOS travel

CREATE TABLE IF NOT EXISTS org_location_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  preset_kind TEXT NOT NULL DEFAULT 'event' CHECK (preset_kind IN ('event', 'travel')),
  venue_name TEXT,
  address TEXT,
  destination TEXT,
  departure_location TEXT,
  meeting_point TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_location_presets_org
  ON org_location_presets(org_id, preset_kind, label);

ALTER TABLE org_location_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_location_presets_select" ON org_location_presets;
CREATE POLICY "org_location_presets_select" ON org_location_presets
  FOR SELECT USING (is_org_member(org_id));

DROP POLICY IF EXISTS "org_location_presets_officer_write" ON org_location_presets;
CREATE POLICY "org_location_presets_officer_write" ON org_location_presets
  FOR ALL USING (is_org_officer(org_id));
