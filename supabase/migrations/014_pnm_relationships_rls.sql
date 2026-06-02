-- ============================================================
-- TouseOS – Migration 014: PNM relationships RLS + follow-up owner index
-- ============================================================

ALTER TABLE pnm_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pnm_relationships_org_select" ON pnm_relationships;
CREATE POLICY "pnm_relationships_org_select" ON pnm_relationships
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pnm_leads p
      JOIN org_members om ON om.org_id = p.org_id
      WHERE p.id = pnm_relationships.pnm_id
        AND om.user_id = auth.uid()
        AND om.status <> 'removed'
    )
  );

DROP POLICY IF EXISTS "pnm_relationships_officer_write" ON pnm_relationships;
CREATE POLICY "pnm_relationships_officer_write" ON pnm_relationships
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pnm_leads p
      JOIN org_members om ON om.org_id = p.org_id
      WHERE p.id = pnm_relationships.pnm_id
        AND om.user_id = auth.uid()
        AND om.status <> 'removed'
        AND om.role IN (
          'owner', 'president', 'vice_president', 'recruitment_chair',
          'social_chair', 'nme_chair', 'secretary'
        )
    )
  );

CREATE INDEX IF NOT EXISTS idx_pnm_relationships_pnm ON pnm_relationships(pnm_id);
CREATE INDEX IF NOT EXISTS idx_pnm_relationships_follow_up ON pnm_relationships(pnm_id) WHERE is_follow_up_owner = true;
