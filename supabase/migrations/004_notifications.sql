-- ============================================================
-- TouseOS – Migration 004: Notification triggers
-- Auto-create in-app notifications on key events.
-- Run after 003_storage.sql
-- ============================================================

-- Helper: notify all officers of an org
CREATE OR REPLACE FUNCTION notify_org_officers(
  p_org_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_link TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO notifications (user_id, org_id, type, title, body, link)
  SELECT om.user_id, p_org_id, p_type, p_title, p_body, p_link
  FROM org_members om
  WHERE om.org_id = p_org_id
    AND om.status NOT IN ('removed','pending_invite')
    AND om.role IN ('owner','president','vice_president','treasurer','secretary',
                    'social_chair','recruitment_chair','risk_manager',
                    'philanthropy_chair','alumni_chair','nme_chair',
                    'standards_chair','pr_chair','advisor',
                    'captain','co_captain','coach','travel_coordinator',
                    'equipment_manager','safety_officer');
END;
$$;

-- Helper: notify a specific member's linked user
CREATE OR REPLACE FUNCTION notify_member_user(
  p_member_id UUID,
  p_org_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_link TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT user_id INTO v_user_id FROM member_profiles WHERE id = p_member_id;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, org_id, type, title, body, link)
    VALUES (v_user_id, p_org_id, p_type, p_title, p_body, p_link);
  END IF;
END;
$$;

-- ── Payment created → notify member ─────────────────────────
CREATE OR REPLACE FUNCTION trg_notify_payment_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.member_id IS NOT NULL AND NEW.status = 'pending' THEN
    PERFORM notify_member_user(
      NEW.member_id, NEW.org_id, 'payment_reminder',
      'New charge added',
      'A new charge of $' || NEW.amount || ' is due' ||
        COALESCE(' by ' || to_char(NEW.due_date, 'Mon DD'), '') || '.',
      '/payments'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_payment_created
  AFTER INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION trg_notify_payment_created();

-- ── Payment overdue update → notify member ──────────────────
CREATE OR REPLACE FUNCTION trg_notify_payment_overdue()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'overdue' AND OLD.status <> 'overdue' AND NEW.member_id IS NOT NULL THEN
    PERFORM notify_member_user(
      NEW.member_id, NEW.org_id, 'payment_reminder',
      'Payment overdue',
      'Your payment of $' || NEW.amount || ' is now overdue. Please pay as soon as possible.',
      '/payments'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_payment_overdue
  AFTER UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION trg_notify_payment_overdue();

-- ── Task assigned → notify assignee ─────────────────────────
CREATE OR REPLACE FUNCTION trg_notify_task_assigned()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL THEN
    INSERT INTO notifications (user_id, org_id, type, title, body, link)
    VALUES (
      NEW.assigned_to, NEW.org_id, 'task_due',
      'New task assigned: ' || NEW.title,
      COALESCE(NEW.description, 'You have a new task.') ||
        COALESCE(' Due ' || to_char(NEW.due_date, 'Mon DD') || '.', ''),
      '/tasks'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_task_assigned
  AFTER INSERT ON tasks
  FOR EACH ROW EXECUTE FUNCTION trg_notify_task_assigned();

-- ── Reimbursement submitted → notify treasurer/president ────
CREATE OR REPLACE FUNCTION trg_notify_reimbursement_submitted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM notify_org_officers(
    NEW.org_id, 'reimbursement_status',
    'New reimbursement request',
    COALESCE(NEW.submitted_by_name, 'A member') || ' requested $' || NEW.amount ||
      ' for ' || NEW.category || '.',
    '/reimbursements'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_reimbursement_submitted
  AFTER INSERT ON reimbursements
  FOR EACH ROW EXECUTE FUNCTION trg_notify_reimbursement_submitted();

-- ── Reimbursement status change → notify submitter ──────────
CREATE OR REPLACE FUNCTION trg_notify_reimbursement_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status <> OLD.status AND NEW.submitted_by IS NOT NULL THEN
    INSERT INTO notifications (user_id, org_id, type, title, body, link)
    VALUES (
      NEW.submitted_by, NEW.org_id, 'reimbursement_status',
      'Reimbursement ' || NEW.status,
      'Your reimbursement request for $' || NEW.amount || ' was ' || NEW.status || '.',
      '/reimbursements'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_reimbursement_status
  AFTER UPDATE ON reimbursements
  FOR EACH ROW EXECUTE FUNCTION trg_notify_reimbursement_status();

-- ── Announcement created → notify all members ───────────────
CREATE OR REPLACE FUNCTION trg_notify_announcement()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO notifications (user_id, org_id, type, title, body, link)
  SELECT om.user_id, NEW.org_id, 'general', NEW.title, NEW.body, '/feed'
  FROM org_members om
  WHERE om.org_id = NEW.org_id
    AND om.status NOT IN ('removed','pending_invite');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_announcement_created
  AFTER INSERT ON announcements
  FOR EACH ROW EXECUTE FUNCTION trg_notify_announcement();

-- ── Photo approval requested → notify social/PR chairs ──────
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
      AND om.role IN ('owner','president','social_chair','pr_chair');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_photo_pending
  AFTER INSERT ON photos
  FOR EACH ROW EXECUTE FUNCTION trg_notify_photo_pending();

-- ── GreekMatch: mutual match → notify both users ────────────
CREATE OR REPLACE FUNCTION trg_notify_greekmatch()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO notifications (user_id, org_id, type, title, body, link)
  VALUES
    (NEW.user_a_id, NULL, 'new_match', 'New match! 💚', 'You have a new GreekMatch. Start a conversation!', '/greekmatch/matches'),
    (NEW.user_b_id, NULL, 'new_match', 'New match! 💚', 'You have a new GreekMatch. Start a conversation!', '/greekmatch/matches');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_greekmatch_created
  AFTER INSERT ON greekmatch_matches
  FOR EACH ROW EXECUTE FUNCTION trg_notify_greekmatch();

-- ── GreekMatch: new message → notify recipient ──────────────
CREATE OR REPLACE FUNCTION trg_notify_greekmatch_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_recipient UUID;
BEGIN
  SELECT CASE WHEN user_a_id = NEW.sender_id THEN user_b_id ELSE user_a_id END
  INTO v_recipient
  FROM greekmatch_matches WHERE id = NEW.match_id;

  IF v_recipient IS NOT NULL THEN
    INSERT INTO notifications (user_id, org_id, type, title, body, link)
    VALUES (v_recipient, NULL, 'match_message', 'New message', 'You have a new GreekMatch message.', '/greekmatch/matches');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_greekmatch_message
  AFTER INSERT ON greekmatch_messages
  FOR EACH ROW EXECUTE FUNCTION trg_notify_greekmatch_message();

-- ── Interchapter proposal → notify target org officers ──────
CREATE OR REPLACE FUNCTION trg_notify_interchapter_proposal()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM notify_org_officers(
    NEW.target_org_id, 'interchapter_proposal',
    'New event proposal',
    'Another chapter proposed "' || NEW.event_name || '" with you.',
    '/interchapter'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_interchapter_proposal
  AFTER INSERT ON interchapter_proposals
  FOR EACH ROW EXECUTE FUNCTION trg_notify_interchapter_proposal();
