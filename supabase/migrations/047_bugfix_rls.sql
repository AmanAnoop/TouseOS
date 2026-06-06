-- Bugfix: event polls + documents RLS (idempotent)

DROP POLICY IF EXISTS event_polls_select ON event_polls;
DROP POLICY IF EXISTS event_polls_insert ON event_polls;
DROP POLICY IF EXISTS event_polls_update ON event_polls;
DROP POLICY IF EXISTS event_polls_delete ON event_polls;

CREATE POLICY event_polls_select ON event_polls
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM org_members om
      JOIN events e ON e.id = event_polls.event_id
      WHERE om.org_id = e.org_id
        AND om.user_id = auth.uid()
        AND om.status <> 'removed'
    )
  );

CREATE POLICY event_polls_insert ON event_polls
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members om
      JOIN events e ON e.id = event_polls.event_id
      WHERE om.org_id = e.org_id
        AND om.user_id = auth.uid()
        AND om.status <> 'removed'
        AND om.role IN (
          'owner','president','vice_president','treasurer','secretary',
          'social_chair','recruitment_chair','risk_manager','philanthropy_chair',
          'nme_chair','pr_chair','advisor','captain','co_captain','coach'
        )
    )
  );

CREATE POLICY event_polls_update ON event_polls
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM org_members om
      JOIN events e ON e.id = event_polls.event_id
      WHERE om.org_id = e.org_id
        AND om.user_id = auth.uid()
        AND om.status <> 'removed'
    )
  );

CREATE POLICY event_polls_delete ON event_polls
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM org_members om
      JOIN events e ON e.id = event_polls.event_id
      WHERE om.org_id = e.org_id
        AND om.user_id = auth.uid()
        AND om.status <> 'removed'
        AND om.role IN (
          'owner','president','vice_president','treasurer','secretary',
          'social_chair','recruitment_chair','risk_manager','philanthropy_chair',
          'nme_chair','pr_chair','advisor','captain','co_captain','coach'
        )
    )
  );

-- Documents: allow any org member to upload (uploaded_by must match)
DROP POLICY IF EXISTS documents_member_insert ON documents;
CREATE POLICY documents_member_insert ON documents
  FOR INSERT WITH CHECK (
    is_org_member(org_id) AND uploaded_by = auth.uid()
  );

ALTER TABLE hardship_requests ADD COLUMN IF NOT EXISTS approved_amount NUMERIC;
