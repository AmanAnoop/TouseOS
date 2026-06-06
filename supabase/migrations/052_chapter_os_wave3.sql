-- Wave 3: document folder RLS, per-member housing rent due day

ALTER TABLE housing_assignments
  ADD COLUMN IF NOT EXISTS rent_due_day INT CHECK (rent_due_day IS NULL OR (rent_due_day >= 1 AND rent_due_day <= 28));

ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_folders_select" ON document_folders;
CREATE POLICY "document_folders_select" ON document_folders FOR SELECT
  USING (is_org_member(org_id));

DROP POLICY IF EXISTS "document_folders_officer_write" ON document_folders;
CREATE POLICY "document_folders_officer_write" ON document_folders FOR ALL
  USING (is_org_officer(org_id));
