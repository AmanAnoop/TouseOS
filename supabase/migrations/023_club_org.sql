-- ClubOS: membership applications and service hours for general_org

CREATE TABLE IF NOT EXISTS club_membership_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  class_year TEXT,
  interests TEXT,
  status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('applied','interview','accepted','declined','waitlisted')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_club_membership_org ON club_membership_applications(org_id, status);

ALTER TABLE club_membership_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "club_membership_select" ON club_membership_applications;
CREATE POLICY "club_membership_select" ON club_membership_applications FOR SELECT USING (is_org_member(org_id));
DROP POLICY IF EXISTS "club_membership_officer_write" ON club_membership_applications;
CREATE POLICY "club_membership_officer_write" ON club_membership_applications FOR ALL USING (is_org_officer(org_id));

CREATE TABLE IF NOT EXISTS club_service_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id UUID REFERENCES member_profiles(id) ON DELETE SET NULL,
  member_name TEXT,
  hours NUMERIC(6,2) NOT NULL CHECK (hours > 0),
  activity TEXT NOT NULL,
  event_date DATE,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_club_service_hours_org ON club_service_hours(org_id, event_date DESC);

ALTER TABLE club_service_hours ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "club_service_hours_select" ON club_service_hours;
CREATE POLICY "club_service_hours_select" ON club_service_hours FOR SELECT USING (is_org_member(org_id));
DROP POLICY IF EXISTS "club_service_hours_write" ON club_service_hours;
CREATE POLICY "club_service_hours_write" ON club_service_hours FOR ALL USING (is_org_member(org_id));
