-- Per-user sidebar navigation customization (per product: greek, sports, club)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS sidebar_preferences JSONB NOT NULL DEFAULT '{}';
