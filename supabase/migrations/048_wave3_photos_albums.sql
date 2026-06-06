-- Wave 3: allow org members to create standalone photo albums (not only event-linked)

DROP POLICY IF EXISTS "photo_albums_member_event_insert" ON photo_albums;
CREATE POLICY "photo_albums_member_insert" ON photo_albums FOR INSERT
  WITH CHECK (
    is_org_member(org_id)
    AND COALESCE(allow_member_upload, true) = true
  );
