-- Platform-wide settings (feature flags, ops config) — service role / platform admin only

CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO platform_settings (key, value)
VALUES (
  'feature_flags',
  '{"greekmatch":true,"interchapter":true,"ai_assistant":true,"stripe_payments":true,"social_content_pack":true}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- No policies: only accessible via service role (platform admin API routes)
