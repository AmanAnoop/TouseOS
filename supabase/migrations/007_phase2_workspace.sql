-- Phase 2: interchapter shared workspaces

CREATE TABLE IF NOT EXISTS interchapter_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES interchapter_proposals(id) ON DELETE CASCADE,
  org_ids UUID[] NOT NULL,
  title TEXT NOT NULL,
  shared_budget JSONB DEFAULT '{"total":0,"splits":[],"line_items":[]}',
  shared_tasks JSONB DEFAULT '[]',
  shared_documents JSONB DEFAULT '[]',
  chat_messages JSONB DEFAULT '[]',
  guest_list JSONB DEFAULT '[]',
  risk_checklist JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_interchapter_workspaces_proposal ON interchapter_workspaces(proposal_id);

CREATE TRIGGER trg_interchapter_workspaces_updated BEFORE UPDATE ON interchapter_workspaces
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE interchapter_workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "interchapter_workspaces_member" ON interchapter_workspaces FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.user_id = auth.uid()
        AND om.org_id = ANY(org_ids)
    )
  );
