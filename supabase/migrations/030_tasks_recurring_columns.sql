-- Tasks: recurring flag and attachments (from 006; safe re-apply if migration 006 was skipped)

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurrence_rule TEXT,
  ADD COLUMN IF NOT EXISTS attachment_urls TEXT[] DEFAULT '{}';
