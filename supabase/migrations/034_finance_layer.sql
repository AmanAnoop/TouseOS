-- Finance layer: Plaid read-only bank + unified transaction feed + setup state

CREATE TABLE IF NOT EXISTS finance_org_settings (
  org_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  setup_path TEXT CHECK (setup_path IN ('stripe', 'plaid', 'both', 'manual')),
  setup_completed_at TIMESTAMPTZ,
  semester_label TEXT DEFAULT 'Current semester',
  semester_dues_amount NUMERIC(12,2),
  semester_dues_due_date DATE,
  late_fee_amount NUMERIC(12,2) DEFAULT 0,
  late_fee_days_after_due INT DEFAULT 14,
  balance_alert_threshold NUMERIC(12,2),
  plaid_status TEXT DEFAULT 'disconnected' CHECK (plaid_status IN ('disconnected', 'connected', 'expired', 'error')),
  plaid_institution_name TEXT,
  plaid_last_synced_at TIMESTAMPTZ,
  plaid_balance_current NUMERIC(14,2),
  plaid_balance_available NUMERIC(14,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Finance officer roles (must exist before RLS policies below reference this function)
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

ALTER TABLE finance_org_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "finance_settings_select" ON finance_org_settings;
CREATE POLICY "finance_settings_select" ON finance_org_settings FOR SELECT
  USING (is_org_member(org_id));
DROP POLICY IF EXISTS "finance_settings_officer_write" ON finance_org_settings;
CREATE POLICY "finance_settings_officer_write" ON finance_org_settings FOR ALL
  USING (is_org_finance_officer(org_id));

-- Plaid tokens: service role only (no client RLS read)
CREATE TABLE IF NOT EXISTS plaid_connections (
  org_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  institution_id TEXT,
  institution_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'error')),
  transactions_cursor TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE plaid_connections ENABLE ROW LEVEL SECURITY;
-- No policies: only service role accesses

CREATE TABLE IF NOT EXISTS finance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('plaid', 'stripe', 'manual')),
  external_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  description TEXT,
  merchant_name TEXT,
  category_key TEXT,
  budget_line_id UUID REFERENCES budget_lines(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  member_id UUID REFERENCES member_profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('posted', 'pending', 'failed', 'disputed', 'uncategorized')),
  pending_review BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (org_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_finance_tx_org_date ON finance_transactions(org_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_tx_category ON finance_transactions(org_id, category_key);

ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "finance_tx_select" ON finance_transactions;
CREATE POLICY "finance_tx_select" ON finance_transactions FOR SELECT
  USING (is_org_finance_officer(org_id));
DROP POLICY IF EXISTS "finance_tx_officer_write" ON finance_transactions;
CREATE POLICY "finance_tx_officer_write" ON finance_transactions FOR ALL
  USING (is_org_finance_officer(org_id));

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ DEFAULT now()
);
