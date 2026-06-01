-- ============================================================
-- TouseOS – Migration 012: Parent pay tokens, hardship requests, recurring metadata
-- ============================================================

ALTER TABLE payments ADD COLUMN IF NOT EXISTS parent_pay_token TEXT UNIQUE;

UPDATE payments
SET parent_pay_token = replace(gen_random_uuid()::text, '-', '')
WHERE parent_pay_token IS NULL;

CREATE OR REPLACE FUNCTION payments_set_parent_pay_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_pay_token IS NULL OR NEW.parent_pay_token = '' THEN
    NEW.parent_pay_token := replace(gen_random_uuid()::text, '-', '');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payments_parent_pay_token ON payments;
CREATE TRIGGER trg_payments_parent_pay_token
  BEFORE INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION payments_set_parent_pay_token();

ALTER TABLE payment_items ADD COLUMN IF NOT EXISTS last_recurring_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS hardship_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id UUID REFERENCES member_profiles(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_amount NUMERIC(12,2),
  arrangement TEXT NOT NULL DEFAULT 'plan',
  reason TEXT NOT NULL,
  additional_context TEXT,
  plan_installments INT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'denied')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hardship_org_status ON hardship_requests(org_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_parent_token ON payments(parent_pay_token);

ALTER TABLE hardship_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hardship_org_members_select" ON hardship_requests
  FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND status <> 'removed'
    )
  );

CREATE POLICY "hardship_members_insert" ON hardship_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND status <> 'removed'
    )
  );

CREATE POLICY "hardship_treasurer_update" ON hardship_requests
  FOR UPDATE TO authenticated
  USING (
    org_id IN (
      SELECT om.org_id FROM org_members om
      WHERE om.user_id = auth.uid()
        AND om.status <> 'removed'
        AND om.role IN ('owner', 'president', 'treasurer', 'vice_president')
    )
  );
