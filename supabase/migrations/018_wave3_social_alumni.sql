-- Wave 3: photo requests RLS, alumni campaigns, collab posts

ALTER TABLE photo_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "photo_requests_select" ON photo_requests;
CREATE POLICY "photo_requests_select" ON photo_requests FOR SELECT
  USING (is_org_member(org_id));
DROP POLICY IF EXISTS "photo_requests_insert" ON photo_requests;
CREATE POLICY "photo_requests_insert" ON photo_requests FOR INSERT
  WITH CHECK (is_org_member(org_id));
DROP POLICY IF EXISTS "photo_requests_officer_update" ON photo_requests;
CREATE POLICY "photo_requests_officer_update" ON photo_requests FOR UPDATE
  USING (is_org_officer(org_id));

CREATE TABLE IF NOT EXISTS alumni_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  audience TEXT DEFAULT 'alumni' CHECK (audience IN ('alumni', 'mentors', 'all_alumni')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'scheduled')),
  sent_at TIMESTAMPTZ,
  recipient_count INT DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alumni_campaigns_org ON alumni_campaigns(org_id, created_at DESC);

ALTER TABLE alumni_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "alumni_campaigns_select" ON alumni_campaigns;
CREATE POLICY "alumni_campaigns_select" ON alumni_campaigns FOR SELECT USING (is_org_member(org_id));
DROP POLICY IF EXISTS "alumni_campaigns_officer_write" ON alumni_campaigns;
CREATE POLICY "alumni_campaigns_officer_write" ON alumni_campaigns FOR ALL USING (is_org_officer(org_id));

CREATE TABLE IF NOT EXISTS collab_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  partner_org_name TEXT NOT NULL,
  title TEXT NOT NULL,
  caption_draft TEXT,
  scheduled_date DATE,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'draft_ready', 'posted', 'cancelled')),
  checklist JSONB DEFAULT '[]',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_collab_posts_org ON collab_posts(org_id, scheduled_date);

ALTER TABLE collab_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "collab_posts_select" ON collab_posts;
CREATE POLICY "collab_posts_select" ON collab_posts FOR SELECT USING (is_org_member(org_id));
DROP POLICY IF EXISTS "collab_posts_officer_write" ON collab_posts;
CREATE POLICY "collab_posts_officer_write" ON collab_posts FOR ALL USING (is_org_officer(org_id));
