-- Budget lines: RLS was enabled in 001 without policies (blocked nested reads).
CREATE POLICY "budget_lines_select" ON budget_lines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM budgets b
      WHERE b.id = budget_lines.budget_id AND is_org_member(b.org_id)
    )
  );

CREATE POLICY "budget_lines_officer_write" ON budget_lines FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM budgets b
      WHERE b.id = budget_lines.budget_id AND is_org_officer(b.org_id)
    )
  );

-- Documents: members see public docs; officers also see private uploads.
DROP POLICY IF EXISTS "documents_select" ON documents;
CREATE POLICY "documents_select" ON documents FOR SELECT
  USING (
    is_org_member(org_id)
    AND (NOT is_private OR is_org_officer(org_id))
  );
