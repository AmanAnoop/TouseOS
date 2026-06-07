-- Batch 8: vendor usage history log

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS usage_history JSONB NOT NULL DEFAULT '[]';
