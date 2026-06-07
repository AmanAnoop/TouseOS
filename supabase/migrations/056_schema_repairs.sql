-- Idempotent schema repairs for prod deployments missing earlier migrations

ALTER TABLE photo_albums
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE governance_meetings
  ADD COLUMN IF NOT EXISTS attendee_ids JSONB DEFAULT '[]';

ALTER TABLE governance_meetings
  ADD COLUMN IF NOT EXISTS expected_attendee_group TEXT DEFAULT 'all_members';

ALTER TABLE photo_requests
  ADD COLUMN IF NOT EXISTS target_member_ids UUID[] NOT NULL DEFAULT '{}';
