-- Chapter OS fixes: tasks points, document folders, photo/doc URL flexibility, standards panel

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS point_reward INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE documents
  ALTER COLUMN url DROP NOT NULL;

ALTER TABLE photos
  ALTER COLUMN url DROP NOT NULL;

CREATE TABLE IF NOT EXISTS document_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES document_folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_folders_org ON document_folders(org_id, name);

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES document_folders(id) ON DELETE SET NULL;

ALTER TABLE standards_cases
  ADD COLUMN IF NOT EXISTS panel_member_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS panel_level TEXT;

ALTER TABLE hardship_requests
  ADD COLUMN IF NOT EXISTS submitter_name TEXT;

DROP POLICY IF EXISTS "hardship_org_members_select" ON hardship_requests;

CREATE POLICY "hardship_member_own_select" ON hardship_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "hardship_officer_select" ON hardship_requests
  FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT om.org_id FROM org_members om
      WHERE om.user_id = auth.uid()
        AND om.status <> 'removed'
        AND om.role IN ('owner', 'president', 'treasurer', 'vice_president', 'advisor')
    )
  );
