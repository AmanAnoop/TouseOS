-- Phase 4: league standings, interchapter availability, push subscriptions

CREATE TABLE IF NOT EXISTS sports_game_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  opponent TEXT NOT NULL,
  played_at DATE NOT NULL DEFAULT CURRENT_DATE,
  score_us INT NOT NULL DEFAULT 0,
  score_them INT NOT NULL DEFAULT 0,
  result TEXT GENERATED ALWAYS AS (
    CASE
      WHEN score_us > score_them THEN 'win'
      WHEN score_us < score_them THEN 'loss'
      ELSE 'tie'
    END
  ) STORED,
  location TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sports_game_results_org ON sports_game_results(org_id, played_at DESC);

CREATE TABLE IF NOT EXISTS interchapter_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_name TEXT,
  available_dates JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  semester TEXT DEFAULT 'current',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (org_id, user_id, semester)
);
CREATE INDEX IF NOT EXISTS idx_interchapter_avail_org ON interchapter_availability(org_id, semester);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, endpoint)
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

ALTER TABLE sports_game_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE interchapter_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sports_game_results_org" ON sports_game_results FOR ALL
  USING (is_org_member(org_id));

CREATE POLICY "interchapter_availability_org" ON interchapter_availability FOR ALL
  USING (is_org_member(org_id));

CREATE POLICY "push_subscriptions_own" ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id);
