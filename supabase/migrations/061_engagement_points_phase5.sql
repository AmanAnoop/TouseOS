-- Phase 5: Custom point opportunities and member proof requests

CREATE TABLE IF NOT EXISTS point_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  points INT NOT NULL DEFAULT 1 CHECK (points >= 0 AND points <= 100),
  category TEXT,
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_point_opportunities_org ON point_opportunities(org_id, active);

CREATE TABLE IF NOT EXISTS point_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES point_opportunities(id) ON DELETE SET NULL,
  points_requested INT NOT NULL CHECK (points_requested > 0 AND points_requested <= 100),
  category TEXT,
  reason TEXT NOT NULL,
  proof_storage_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  denial_reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  point_entry_id UUID REFERENCES member_point_entries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_point_requests_org ON point_requests(org_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_requests_member ON point_requests(member_id, created_at DESC);

ALTER TABLE member_point_entries
  ADD COLUMN IF NOT EXISTS opportunity_id UUID REFERENCES point_opportunities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES point_requests(id) ON DELETE SET NULL;

ALTER TABLE point_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "point_opportunities_select" ON point_opportunities FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY "point_opportunities_officer_write" ON point_opportunities FOR ALL
  USING (is_org_officer(org_id));

CREATE POLICY "point_requests_select" ON point_requests FOR SELECT
  USING (
    is_org_officer(org_id)
    OR EXISTS (
      SELECT 1 FROM member_profiles mp
      WHERE mp.id = point_requests.member_id
        AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "point_requests_member_insert" ON point_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM member_profiles mp
      WHERE mp.id = member_id
        AND mp.user_id = auth.uid()
        AND mp.org_id = org_id
    )
    AND status = 'pending'
  );

CREATE POLICY "point_requests_officer_update" ON point_requests FOR UPDATE
  USING (is_org_officer(org_id));
