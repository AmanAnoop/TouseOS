-- ============================================================
-- TouseOS – Migration 013: Rush interest matcher (consent-based enrichment)
-- Stores officer-provided public bio text + AI-extracted interests for PNM–member matching.
-- Does NOT store scraped Instagram credentials or automate ToS-violating scraping.
-- ============================================================

ALTER TABLE pnm_leads ADD COLUMN IF NOT EXISTS instagram_bio_text TEXT;
ALTER TABLE pnm_leads ADD COLUMN IF NOT EXISTS ai_interest_summary TEXT;
ALTER TABLE pnm_leads ADD COLUMN IF NOT EXISTS profile_enriched_at TIMESTAMPTZ;
ALTER TABLE pnm_leads ADD COLUMN IF NOT EXISTS enrichment_consent BOOLEAN DEFAULT false;
ALTER TABLE pnm_leads ADD COLUMN IF NOT EXISTS enrichment_consent_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS pnm_rush_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pnm_id UUID NOT NULL REFERENCES pnm_leads(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  score INT NOT NULL CHECK (score BETWEEN 0 AND 100),
  shared_interests TEXT[] DEFAULT '{}',
  match_reasons TEXT[] DEFAULT '{}',
  computed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (pnm_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_pnm_rush_matches_pnm ON pnm_rush_matches(pnm_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_pnm_rush_matches_org ON pnm_rush_matches(org_id);

ALTER TABLE pnm_rush_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pnm_rush_matches_org_select" ON pnm_rush_matches
  FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND status <> 'removed'
    )
  );

CREATE POLICY "pnm_rush_matches_officer_write" ON pnm_rush_matches
  FOR ALL TO authenticated
  USING (
    org_id IN (
      SELECT om.org_id FROM org_members om
      WHERE om.user_id = auth.uid()
        AND om.status <> 'removed'
        AND om.role IN (
          'owner', 'president', 'vice_president', 'recruitment_chair',
          'social_chair', 'nme_chair'
        )
    )
  );

CREATE TABLE IF NOT EXISTS pnm_enrichment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pnm_id UUID NOT NULL REFERENCES pnm_leads(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'manual_bio_paste',
  consent_confirmed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pnm_enrichment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pnm_enrichment_logs_org" ON pnm_enrichment_logs
  FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND status <> 'removed'
    )
  );

CREATE POLICY "pnm_enrichment_logs_insert" ON pnm_enrichment_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT om.org_id FROM org_members om
      WHERE om.user_id = auth.uid()
        AND om.status <> 'removed'
        AND om.role IN (
          'owner', 'president', 'vice_president', 'recruitment_chair',
          'social_chair', 'nme_chair'
        )
    )
  );
