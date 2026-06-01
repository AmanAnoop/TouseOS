-- Phase 9: per-type notification preferences for frontend push/email filtering

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{
    "event_reminder": true,
    "payment_reminder": true,
    "task_due": true,
    "form_missing": true,
    "reimbursement_status": true,
    "new_match": true,
    "photo_approval": true,
    "general": true
  }'::jsonb;
