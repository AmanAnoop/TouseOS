-- Link photo prompt batches to event albums for direct member uploads

ALTER TABLE event_photo_prompt_batches
  ADD COLUMN IF NOT EXISTS album_id UUID REFERENCES photo_albums(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_event_photo_prompts_album ON event_photo_prompt_batches(album_id);

-- Members may create event-linked albums when uploading for prompts (officers still manage via existing policy)
DROP POLICY IF EXISTS "photo_albums_member_event_insert" ON photo_albums;
CREATE POLICY "photo_albums_member_event_insert" ON photo_albums FOR INSERT
  WITH CHECK (
    is_org_member(org_id)
    AND event_id IS NOT NULL
    AND allow_member_upload = true
  );
