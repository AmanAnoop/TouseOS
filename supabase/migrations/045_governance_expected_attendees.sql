-- Expected attendees (replaces quorum in UI)

ALTER TABLE governance_meetings
  ADD COLUMN IF NOT EXISTS expected_attendee_group TEXT DEFAULT 'all_members';

ALTER TABLE governance_votes
  ADD COLUMN IF NOT EXISTS voter_group TEXT DEFAULT 'all_members',
  ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;
