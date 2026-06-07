-- Notify VP on photo approval requests (alongside president / social / PR chairs).

CREATE OR REPLACE FUNCTION trg_notify_photo_pending()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    INSERT INTO notifications (user_id, org_id, type, title, body, link)
    SELECT om.user_id, NEW.org_id, 'photo_approval',
      'Photo pending approval',
      'A new photo was uploaded and needs review.',
      '/social'
    FROM org_members om
    WHERE om.org_id = NEW.org_id
      AND om.role IN ('owner','president','vice_president','social_chair','pr_chair');
  END IF;
  RETURN NEW;
END;
$$;
