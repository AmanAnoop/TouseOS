-- Phase 1: Events calendar, comments, point opportunities, event announcements

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS is_point_opportunity BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS point_value INT,
  ADD COLUMN IF NOT EXISTS point_category TEXT;

ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_announcements_event ON announcements(event_id, created_at DESC);

ALTER TABLE event_rsvps
  ADD COLUMN IF NOT EXISTS check_in_method TEXT
    CHECK (check_in_method IS NULL OR check_in_method IN ('rotating_ticket', 'qr', 'manual'));

CREATE TABLE IF NOT EXISTS event_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT,
  parent_id UUID REFERENCES event_comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_comments_event ON event_comments(event_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_event_comments_parent ON event_comments(parent_id);

ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_comments_select" ON event_comments FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY "event_comments_insert" ON event_comments FOR INSERT
  WITH CHECK (
    is_org_member(org_id)
    AND author_id = auth.uid()
  );

CREATE POLICY "event_comments_update_own" ON event_comments FOR UPDATE
  USING (author_id = auth.uid());

CREATE POLICY "event_comments_delete" ON event_comments FOR DELETE
  USING (author_id = auth.uid() OR is_org_officer(org_id));
