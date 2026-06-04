-- Budget: fix budget_lines RLS (INSERT WITH CHECK) and add archive support

ALTER TABLE budgets
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_budgets_org_active
  ON budgets(org_id, archived_at NULLS FIRST, created_at DESC);

-- Roles that may create/edit/delete budgets and lines (matches app manage_budget)
CREATE OR REPLACE FUNCTION is_org_budget_editor(p_org_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
      AND status IS DISTINCT FROM 'removed'
      AND role IN (
        'owner', 'president', 'vice_president', 'treasurer',
        'captain', 'co_captain', 'coach', 'travel_coordinator'
      )
  );
$$;

-- budgets: replace single FOR ALL policy with explicit policies
DROP POLICY IF EXISTS "budgets_officer_write" ON budgets;

DROP POLICY IF EXISTS "budgets_editor_insert" ON budgets;
CREATE POLICY "budgets_editor_insert" ON budgets FOR INSERT
  WITH CHECK (is_org_budget_editor(org_id));

DROP POLICY IF EXISTS "budgets_editor_update" ON budgets;
CREATE POLICY "budgets_editor_update" ON budgets FOR UPDATE
  USING (is_org_budget_editor(org_id))
  WITH CHECK (is_org_budget_editor(org_id));

DROP POLICY IF EXISTS "budgets_editor_delete" ON budgets;
CREATE POLICY "budgets_editor_delete" ON budgets FOR DELETE
  USING (is_org_budget_editor(org_id));

-- budget_lines: explicit INSERT/UPDATE/DELETE with WITH CHECK
DROP POLICY IF EXISTS "budget_lines_officer_write" ON budget_lines;

DROP POLICY IF EXISTS "budget_lines_editor_insert" ON budget_lines;
CREATE POLICY "budget_lines_editor_insert" ON budget_lines FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM budgets b
      WHERE b.id = budget_lines.budget_id
        AND is_org_budget_editor(b.org_id)
    )
  );

DROP POLICY IF EXISTS "budget_lines_editor_update" ON budget_lines;
CREATE POLICY "budget_lines_editor_update" ON budget_lines FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM budgets b
      WHERE b.id = budget_lines.budget_id
        AND is_org_budget_editor(b.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM budgets b
      WHERE b.id = budget_lines.budget_id
        AND is_org_budget_editor(b.org_id)
    )
  );

DROP POLICY IF EXISTS "budget_lines_editor_delete" ON budget_lines;
CREATE POLICY "budget_lines_editor_delete" ON budget_lines FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM budgets b
      WHERE b.id = budget_lines.budget_id
        AND is_org_budget_editor(b.org_id)
    )
  );
