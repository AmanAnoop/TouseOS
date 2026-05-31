-- TouseOS rollout enhancements: health scores, governance, attendance points,
-- task comments, document versions, reimbursement approvals, sports status

-- Member status extensions
ALTER TYPE member_status ADD VALUE IF NOT EXISTS 'suspended';
ALTER TYPE member_status ADD VALUE IF NOT EXISTS 'new_member';

ALTER TABLE member_profiles
  ADD COLUMN IF NOT EXISTS sports_status TEXT DEFAULT 'active'
    CHECK (sports_status IN (
      'active','practice_squad','injured','inactive','captain','officer',
      'coach','alumni','tryout_candidate'
    ));

-- Reimbursement multi-level approval
ALTER TABLE reimbursements
  ADD COLUMN IF NOT EXISTS treasurer_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS president_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS advisor_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_threshold NUMERIC(12,2) DEFAULT 250;

-- Task enhancements
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurrence_rule TEXT,
  ADD COLUMN IF NOT EXISTS attachment_urls TEXT[] DEFAULT '{}';

CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);

-- Document version history
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;

CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version INT NOT NULL,
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_document_versions_doc ON document_versions(document_id);

-- Organization health score (manual overrides + computed snapshot)
CREATE TABLE IF NOT EXISTS org_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period TEXT NOT NULL DEFAULT 'current',
  manual_scores JSONB DEFAULT '{}',
  computed_scores JSONB DEFAULT '{}',
  composite_score INT DEFAULT 0,
  notes TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  computed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (org_id, period)
);
CREATE INDEX IF NOT EXISTS idx_org_health_org ON org_health_scores(org_id);

-- Governance & meetings
CREATE TABLE IF NOT EXISTS governance_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  meeting_type TEXT DEFAULT 'chapter_meeting',
  scheduled_at TIMESTAMPTZ,
  location TEXT,
  agenda TEXT,
  minutes TEXT,
  quorum_required INT DEFAULT 0,
  quorum_present INT DEFAULT 0,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER trg_governance_meetings_updated BEFORE UPDATE ON governance_meetings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS governance_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  meeting_id UUID REFERENCES governance_meetings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  options JSONB DEFAULT '["Yes","No","Abstain"]',
  votes JSONB DEFAULT '{}',
  status TEXT DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Attendance points system
CREATE TABLE IF NOT EXISTS attendance_point_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  points INT NOT NULL DEFAULT 1,
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (org_id, event_type)
);

CREATE TABLE IF NOT EXISTS member_point_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  points INT NOT NULL,
  reason TEXT,
  entry_type TEXT DEFAULT 'earned' CHECK (entry_type IN ('earned','deduction','excused')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_member_points_member ON member_point_entries(org_id, member_id);

-- Tournament brackets
CREATE TABLE IF NOT EXISTS tournament_brackets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  bracket_data JSONB NOT NULL DEFAULT '{"rounds":[]}',
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Scheduled announcements
CREATE TABLE IF NOT EXISTS scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('announcement','email','sms')),
  title TEXT,
  body TEXT NOT NULL,
  audience TEXT[] DEFAULT '{"all"}',
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','sent','cancelled','failed')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Parent payment links (tokenized checkout for parents)
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS parent_pay_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  ADD COLUMN IF NOT EXISTS parent_email TEXT;

-- RLS for new tables
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_point_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_point_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_comments_org" ON task_comments FOR ALL
  USING (EXISTS (SELECT 1 FROM tasks t JOIN org_members om ON om.org_id = t.org_id WHERE t.id = task_id AND om.user_id = auth.uid()));

CREATE POLICY "document_versions_org" ON document_versions FOR SELECT
  USING (EXISTS (SELECT 1 FROM documents d JOIN org_members om ON om.org_id = d.org_id WHERE d.id = document_id AND om.user_id = auth.uid()));

CREATE POLICY "org_health_scores_org" ON org_health_scores FOR ALL
  USING (is_org_member(org_id));

CREATE POLICY "governance_meetings_org" ON governance_meetings FOR ALL
  USING (is_org_member(org_id));

CREATE POLICY "governance_votes_org" ON governance_votes FOR ALL
  USING (is_org_member(org_id));

CREATE POLICY "attendance_point_rules_org" ON attendance_point_rules FOR ALL
  USING (is_org_officer(org_id));

CREATE POLICY "member_point_entries_org" ON member_point_entries FOR ALL
  USING (is_org_member(org_id));

CREATE POLICY "tournament_brackets_org" ON tournament_brackets FOR ALL
  USING (is_org_member(org_id));

CREATE POLICY "scheduled_messages_officer" ON scheduled_messages FOR ALL
  USING (is_org_officer(org_id));
