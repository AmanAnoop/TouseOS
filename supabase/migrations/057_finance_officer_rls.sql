-- Repair: is_org_finance_officer must exist before finance RLS policies (034 ordering fix).
-- Grants president, vice president, and treasurer the same finance-layer access.

CREATE OR REPLACE FUNCTION is_org_finance_officer(oid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = oid
      AND user_id = auth.uid()
      AND status != 'removed'
      AND role IN ('owner', 'president', 'vice_president', 'treasurer')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'finance_org_settings'
  ) THEN
    ALTER TABLE finance_org_settings ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "finance_settings_select" ON finance_org_settings;
    CREATE POLICY "finance_settings_select" ON finance_org_settings FOR SELECT
      USING (is_org_member(org_id));
    DROP POLICY IF EXISTS "finance_settings_officer_write" ON finance_org_settings;
    CREATE POLICY "finance_settings_officer_write" ON finance_org_settings FOR ALL
      USING (is_org_finance_officer(org_id));
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'finance_transactions'
  ) THEN
    ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "finance_tx_select" ON finance_transactions;
    CREATE POLICY "finance_tx_select" ON finance_transactions FOR SELECT
      USING (is_org_finance_officer(org_id));
    DROP POLICY IF EXISTS "finance_tx_officer_write" ON finance_transactions;
    CREATE POLICY "finance_tx_officer_write" ON finance_transactions FOR ALL
      USING (is_org_finance_officer(org_id));
  END IF;
END $$;
