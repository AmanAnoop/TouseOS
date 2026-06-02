-- Wave 4: event photo prompts, PR compliance reviews, yearbook sections

CREATE TABLE IF NOT EXISTS event_photo_prompt_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  prompts JSONB NOT NULL DEFAULT '[]',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_event_photo_prompts_event ON event_photo_prompt_batches(event_id, created_at DESC);

ALTER TABLE event_photo_prompt_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "event_photo_prompts_select" ON event_photo_prompt_batches;
CREATE POLICY "event_photo_prompts_select" ON event_photo_prompt_batches FOR SELECT USING (is_org_member(org_id));
DROP POLICY IF EXISTS "event_photo_prompts_officer_write" ON event_photo_prompt_batches;
CREATE POLICY "event_photo_prompts_officer_write" ON event_photo_prompt_batches FOR ALL USING (is_org_officer(org_id));

CREATE TABLE IF NOT EXISTS pr_compliance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  photo_ids UUID[] DEFAULT '{}',
  checklist JSONB NOT NULL DEFAULT '[]',
  all_cleared BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pr_compliance_org ON pr_compliance_reviews(org_id, created_at DESC);

ALTER TABLE pr_compliance_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pr_compliance_select" ON pr_compliance_reviews;
CREATE POLICY "pr_compliance_select" ON pr_compliance_reviews FOR SELECT USING (is_org_member(org_id));
DROP POLICY IF EXISTS "pr_compliance_officer_write" ON pr_compliance_reviews;
CREATE POLICY "pr_compliance_officer_write" ON pr_compliance_reviews FOR ALL USING (is_org_officer(org_id));

CREATE TABLE IF NOT EXISTS yearbook_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL CHECK (section_type IN (
    'senior_spotlight', 'award', 'alumni_message', 'exec_board', 'philanthropy_highlight'
  )),
  title TEXT NOT NULL,
  body TEXT,
  person_name TEXT,
  image_url TEXT,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_yearbook_sections_org ON yearbook_sections(org_id, order_index);

ALTER TABLE yearbook_sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "yearbook_sections_select" ON yearbook_sections;
CREATE POLICY "yearbook_sections_select" ON yearbook_sections FOR SELECT USING (is_org_member(org_id));
DROP POLICY IF EXISTS "yearbook_sections_officer_write" ON yearbook_sections;
CREATE POLICY "yearbook_sections_officer_write" ON yearbook_sections FOR ALL USING (is_org_officer(org_id));
