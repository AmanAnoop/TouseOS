-- Phase 10: RLS for payment_plans (frontend payment plans page)

ALTER TABLE payment_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_plans_org_read" ON payment_plans FOR SELECT
  USING (
    payment_id IN (
      SELECT id FROM payments WHERE is_org_member(org_id)
    )
  );

CREATE POLICY "payment_plans_officer_write" ON payment_plans FOR ALL
  USING (
    payment_id IN (
      SELECT p.id FROM payments p WHERE is_org_officer(p.org_id)
    )
  );
