-- Batch 10: study hours tracking (sorority/fraternity)

CREATE TABLE IF NOT EXISTS study_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  location TEXT,
  hours NUMERIC(4,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  notes TEXT,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_hours_org_member ON study_hours(org_id, member_id, session_date DESC);

ALTER TABLE study_hours ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "study_hours_member_select" ON study_hours;
CREATE POLICY "study_hours_member_select" ON study_hours FOR SELECT USING (is_org_member(org_id));
DROP POLICY IF EXISTS "study_hours_member_insert" ON study_hours;
CREATE POLICY "study_hours_member_insert" ON study_hours FOR INSERT WITH CHECK (is_org_member(org_id));
DROP POLICY IF EXISTS "study_hours_officer_all" ON study_hours;
CREATE POLICY "study_hours_officer_all" ON study_hours FOR ALL USING (is_org_officer(org_id));
