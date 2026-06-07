-- Phase 2–3: Event gallery engagement + tickets / point gates

ALTER TABLE photo_albums
  ADD COLUMN IF NOT EXISTS require_upload_approval BOOLEAN DEFAULT false;

ALTER TABLE photos
  ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image'
    CHECK (media_type IN ('image', 'video'));

ALTER TABLE member_point_entries
  ADD COLUMN IF NOT EXISTS category TEXT;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS point_gate_min INT,
  ADD COLUMN IF NOT EXISTS point_gate_category TEXT;

CREATE TABLE IF NOT EXISTS photo_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (photo_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_photo_likes_photo ON photo_likes(photo_id);

CREATE TABLE IF NOT EXISTS photo_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_photo_comments_photo ON photo_comments(photo_id, created_at ASC);

ALTER TABLE photo_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "photo_likes_select" ON photo_likes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM photos p
      WHERE p.id = photo_likes.photo_id AND is_org_member(p.org_id)
    )
  );

CREATE POLICY "photo_likes_insert" ON photo_likes FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM photos p
      WHERE p.id = photo_id AND is_org_member(p.org_id)
    )
  );

CREATE POLICY "photo_likes_delete_own" ON photo_likes FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "photo_comments_select" ON photo_comments FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY "photo_comments_insert" ON photo_comments FOR INSERT
  WITH CHECK (is_org_member(org_id) AND author_id = auth.uid());

CREATE POLICY "photo_comments_delete" ON photo_comments FOR DELETE
  USING (author_id = auth.uid() OR is_org_officer(org_id));
