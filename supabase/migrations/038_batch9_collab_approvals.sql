-- Batch 9: collab bilateral PR approvals

ALTER TABLE collab_posts
  ADD COLUMN IF NOT EXISTS partner_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS our_pr_approved BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS partner_pr_approved BOOLEAN DEFAULT false;
