-- Budget lines + payment items RLS (enabled in 001 without policies)
CREATE POLICY "budget_lines_select" ON budget_lines FOR SELECT
  USING (EXISTS (SELECT 1 FROM budgets b WHERE b.id = budget_lines.budget_id AND is_org_member(b.org_id)));

CREATE POLICY "budget_lines_officer_write" ON budget_lines FOR ALL
  USING (EXISTS (SELECT 1 FROM budgets b WHERE b.id = budget_lines.budget_id AND is_org_officer(b.org_id)));

CREATE POLICY "payment_items_select" ON payment_items FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY "payment_items_officer_write" ON payment_items FOR ALL
  USING (is_org_officer(org_id));

-- Tasks: creators and assignees can update (not only officers)
DROP POLICY IF EXISTS "tasks_officer_update" ON tasks;
CREATE POLICY "tasks_member_update" ON tasks FOR UPDATE
  USING (
    is_org_member(org_id)
    AND (is_org_officer(org_id) OR assigned_to = auth.uid() OR created_by = auth.uid())
  );

-- Private documents (if policy exists from older migration, replace)
DROP POLICY IF EXISTS "documents_select" ON documents;
CREATE POLICY "documents_select" ON documents FOR SELECT
  USING (is_org_member(org_id) AND (NOT is_private OR is_org_officer(org_id)));

-- Housing local contacts (maintenance vendors, house manager, etc.)
CREATE TABLE IF NOT EXISTS housing_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role_label TEXT,
  category TEXT DEFAULT 'general',
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER trg_housing_contacts_updated BEFORE UPDATE ON housing_contacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX IF NOT EXISTS idx_housing_contacts_org ON housing_contacts(org_id);

ALTER TABLE housing_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "housing_contacts_select" ON housing_contacts FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "housing_contacts_officer_write" ON housing_contacts FOR ALL USING (is_org_officer(org_id));

-- Members can complete their own sports waivers after signing a form
CREATE POLICY "sports_waivers_member_own" ON sports_waivers FOR ALL
  USING (
    member_id IN (SELECT id FROM member_profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    member_id IN (SELECT id FROM member_profiles WHERE user_id = auth.uid())
  );
