-- Platform SaaS plan tracking per organization
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS platform_plan TEXT NOT NULL DEFAULT 'starter'
    CHECK (platform_plan IN ('starter', 'chapter', 'council', 'enterprise')),
  ADD COLUMN IF NOT EXISTS platform_plan_status TEXT NOT NULL DEFAULT 'active'
    CHECK (platform_plan_status IN ('active', 'trial', 'past_due', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_organizations_platform_plan ON organizations(platform_plan);
