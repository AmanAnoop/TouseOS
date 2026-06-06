-- Pilot fixes: PNM eval RLS, photo albums, photo requests, tasks rewards, dashboard layout

-- PNM evaluations (RLS was enabled with no policies)
DROP POLICY IF EXISTS pnm_evaluations_org_select ON pnm_evaluations;
CREATE POLICY pnm_evaluations_org_select ON pnm_evaluations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pnm_leads pl
      JOIN org_members om ON om.org_id = pl.org_id
      WHERE pl.id = pnm_evaluations.pnm_id
        AND om.user_id = auth.uid()
        AND om.status <> 'removed'
    )
  );

DROP POLICY IF EXISTS pnm_evaluations_org_insert ON pnm_evaluations;
CREATE POLICY pnm_evaluations_org_insert ON pnm_evaluations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM pnm_leads pl
      JOIN org_members om ON om.org_id = pl.org_id
      WHERE pl.id = pnm_id
        AND om.user_id = auth.uid()
        AND om.status <> 'removed'
    )
  );

DROP POLICY IF EXISTS pnm_evaluations_org_update ON pnm_evaluations;
CREATE POLICY pnm_evaluations_org_update ON pnm_evaluations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM pnm_leads pl
      JOIN org_members om ON om.org_id = pl.org_id
      WHERE pl.id = pnm_evaluations.pnm_id
        AND om.user_id = auth.uid()
        AND om.status <> 'removed'
    )
  );

-- Photo albums: API inserts created_by
ALTER TABLE photo_albums
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Photo requests: target specific members instead of open broadcast
ALTER TABLE photo_requests
  ADD COLUMN IF NOT EXISTS target_member_ids UUID[] NOT NULL DEFAULT '{}';

-- Tasks: open completion + custom reward text
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS point_reward_open BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS custom_reward_text TEXT;

-- Dashboard widget layout (per-user, keyed by org id in JSON)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS dashboard_layout JSONB NOT NULL DEFAULT '{}';
