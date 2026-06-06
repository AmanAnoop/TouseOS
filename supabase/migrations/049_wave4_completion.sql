-- Wave 4: collab photo links, form share tokens

ALTER TABLE collab_posts
  ADD COLUMN IF NOT EXISTS photo_ids UUID[] DEFAULT '{}';

ALTER TABLE forms
  ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex');

CREATE INDEX IF NOT EXISTS idx_forms_share_token ON forms(share_token);

-- Backfill tokens for existing forms
UPDATE forms SET share_token = encode(gen_random_bytes(12), 'hex') WHERE share_token IS NULL;
