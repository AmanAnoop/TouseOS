-- UX bugfixes: task point recipient, Greek org discovery for interchapter

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS point_reward_recipient TEXT NOT NULL DEFAULT 'completer'
    CHECK (point_reward_recipient IN ('completer', 'assignees'));

-- Allow authenticated users to discover other Greek chapters for interchapter proposals
DROP POLICY IF EXISTS organizations_greek_discovery_select ON organizations;
CREATE POLICY organizations_greek_discovery_select ON organizations
  FOR SELECT
  USING (
    type IN ('fraternity', 'sorority')
    AND auth.uid() IS NOT NULL
  );
