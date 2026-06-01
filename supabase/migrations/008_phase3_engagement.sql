-- Phase 3: document version writes, default point rules helper

CREATE POLICY "document_versions_insert" ON document_versions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM documents d
    JOIN org_members om ON om.org_id = d.org_id
    WHERE d.id = document_id AND om.user_id = auth.uid()
  ));

CREATE POLICY "document_versions_update" ON document_versions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM documents d
    JOIN org_members om ON om.org_id = d.org_id
    WHERE d.id = document_id AND om.user_id = auth.uid()
  ));

-- Engagement tracking notes on events (optional metadata)
ALTER TABLE events ADD COLUMN IF NOT EXISTS engagement_goal INT DEFAULT NULL;
