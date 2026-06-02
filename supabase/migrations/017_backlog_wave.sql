-- Coaching tools
CREATE TABLE IF NOT EXISTS coaching_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  note_type TEXT NOT NULL CHECK (note_type IN ('practice', 'game', 'goal')),
  title TEXT,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coaching_notes_org ON coaching_notes(org_id, note_type, created_at DESC);

ALTER TABLE coaching_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coaching_notes_org" ON coaching_notes;
CREATE POLICY "coaching_notes_org" ON coaching_notes FOR ALL
  USING (is_org_member(org_id));

-- NME: members complete own progress
DROP POLICY IF EXISTS "nme_progress_member_upsert" ON nme_progress;
CREATE POLICY "nme_progress_member_upsert" ON nme_progress FOR INSERT
  WITH CHECK (
    member_id IN (SELECT id FROM member_profiles WHERE user_id = auth.uid())
  );
DROP POLICY IF EXISTS "nme_progress_member_update" ON nme_progress;
CREATE POLICY "nme_progress_member_update" ON nme_progress FOR UPDATE
  USING (
    member_id IN (SELECT id FROM member_profiles WHERE user_id = auth.uid())
  );

-- Philanthropy donations (public can donate to active campaigns)
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "donations_select_org" ON donations;
CREATE POLICY "donations_select_org" ON donations FOR SELECT
  USING (is_org_member(org_id));
DROP POLICY IF EXISTS "donations_insert_public" ON donations;
CREATE POLICY "donations_insert_public" ON donations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM philanthropy_campaigns c
      WHERE c.id = campaign_id AND c.is_active = true
    )
  );

-- Social assets library
CREATE TABLE IF NOT EXISTS social_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  asset_type TEXT DEFAULT 'template' CHECK (asset_type IN ('template', 'logo', 'banner', 'story')),
  content TEXT,
  file_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_social_assets_org ON social_assets(org_id);

ALTER TABLE social_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "social_assets_select" ON social_assets;
CREATE POLICY "social_assets_select" ON social_assets FOR SELECT USING (is_org_member(org_id));
DROP POLICY IF EXISTS "social_assets_officer_write" ON social_assets;
CREATE POLICY "social_assets_officer_write" ON social_assets FOR ALL USING (is_org_officer(org_id));

-- Allow members to update governance vote ballots (votes jsonb)
DROP POLICY IF EXISTS "governance_votes_member_update_ballot" ON governance_votes;
CREATE POLICY "governance_votes_member_update_ballot" ON governance_votes FOR UPDATE
  USING (is_org_member(org_id))
  WITH CHECK (is_org_member(org_id));
