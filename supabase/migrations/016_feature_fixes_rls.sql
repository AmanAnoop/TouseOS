-- Form responses: members submit; officers read all in org
ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "form_responses_member_insert" ON form_responses;
CREATE POLICY "form_responses_member_insert" ON form_responses
  FOR INSERT
  WITH CHECK (
    member_id IN (
      SELECT mp.id FROM member_profiles mp
      JOIN org_members om ON om.org_id = mp.org_id
      WHERE om.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "form_responses_member_select_own" ON form_responses;
CREATE POLICY "form_responses_member_select_own" ON form_responses
  FOR SELECT
  USING (
    member_id IN (
      SELECT id FROM member_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "form_responses_officer_select" ON form_responses;
CREATE POLICY "form_responses_officer_select" ON form_responses
  FOR SELECT
  USING (
    form_id IN (
      SELECT f.id FROM forms f
      WHERE is_org_officer(f.org_id)
    )
  );

-- Incident reports: any member can file
DROP POLICY IF EXISTS "incident_reports_member_insert" ON incident_reports;
CREATE POLICY "incident_reports_member_insert" ON incident_reports
  FOR INSERT
  WITH CHECK (is_org_member(org_id));

-- Members can sign their own sports waivers
DROP POLICY IF EXISTS "sports_waivers_member_upsert" ON sports_waivers;
CREATE POLICY "sports_waivers_member_upsert" ON sports_waivers
  FOR INSERT
  WITH CHECK (
    member_id IN (
      SELECT id FROM member_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "sports_waivers_member_update" ON sports_waivers;
CREATE POLICY "sports_waivers_member_update" ON sports_waivers
  FOR UPDATE
  USING (
    member_id IN (
      SELECT id FROM member_profiles WHERE user_id = auth.uid()
    )
  );

-- Housing assignments + maintenance (rooms already have RLS in 001)
ALTER TABLE housing_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "housing_assignments_select" ON housing_assignments;
CREATE POLICY "housing_assignments_select" ON housing_assignments FOR SELECT
  USING (
    room_id IN (SELECT id FROM housing_rooms WHERE is_org_member(org_id))
  );

DROP POLICY IF EXISTS "housing_assignments_officer_write" ON housing_assignments;
CREATE POLICY "housing_assignments_officer_write" ON housing_assignments FOR ALL
  USING (
    room_id IN (SELECT id FROM housing_rooms WHERE is_org_officer(org_id))
  );

DROP POLICY IF EXISTS "maintenance_requests_select" ON maintenance_requests;
CREATE POLICY "maintenance_requests_select" ON maintenance_requests FOR SELECT USING (is_org_member(org_id));

DROP POLICY IF EXISTS "maintenance_requests_member_insert" ON maintenance_requests;
CREATE POLICY "maintenance_requests_member_insert" ON maintenance_requests FOR INSERT WITH CHECK (is_org_member(org_id));

DROP POLICY IF EXISTS "maintenance_requests_officer_update" ON maintenance_requests;
CREATE POLICY "maintenance_requests_officer_update" ON maintenance_requests FOR UPDATE USING (is_org_officer(org_id));
