-- ============================================================
-- TouseOS – Migration 002: Member profiles + GreekMatch
-- Run after 001_schema.sql
-- ============================================================

-- ── Extend member_profiles with self-editable fields ────────
ALTER TABLE member_profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS pronouns TEXT,
  ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS cover_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS twitter_url TEXT,
  ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'org_members'
    CHECK (profile_visibility IN ('org_members','officers_only','private'));

-- Allow members to edit their own profile fields
CREATE POLICY "member_profiles_self_edit" ON member_profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- GREEKMATCH
-- ============================================================

CREATE TABLE greekmatch_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Public-facing match profile
  display_name TEXT NOT NULL,
  age INT CHECK (age >= 18 AND age <= 30),
  bio TEXT,
  photos TEXT[] DEFAULT '{}',
  major TEXT,
  graduation_year INT,
  interests TEXT[] DEFAULT '{}',
  personality_traits TEXT[] DEFAULT '{}',

  -- Preferences
  gender TEXT,
  interested_in TEXT[] DEFAULT '{"men","women"}',
  min_age INT DEFAULT 18,
  max_age INT DEFAULT 30,
  same_org_ok BOOLEAN DEFAULT false,

  -- Privacy
  is_active BOOLEAN DEFAULT true,
  show_org_name BOOLEAN DEFAULT true,
  show_full_name BOOLEAN DEFAULT false,

  -- Status
  verified BOOLEAN DEFAULT false,
  paused BOOLEAN DEFAULT false,

  opted_in_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (user_id)
);

CREATE TRIGGER trg_gm_profiles_updated BEFORE UPDATE ON greekmatch_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_gm_profiles_org ON greekmatch_profiles(org_id);
CREATE INDEX idx_gm_profiles_active ON greekmatch_profiles(is_active) WHERE is_active = true;

-- Interactions (like / pass / block / report)
CREATE TABLE greekmatch_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('like','super_like','pass','block','report')),
  report_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (actor_id, target_id)
);
CREATE INDEX idx_gm_interactions_actor ON greekmatch_interactions(actor_id);
CREATE INDEX idx_gm_interactions_target ON greekmatch_interactions(target_id);

-- Matches (mutual like → match)
CREATE TABLE greekmatch_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  matched_at TIMESTAMPTZ DEFAULT now(),
  user_a_unmatched BOOLEAN DEFAULT false,
  user_b_unmatched BOOLEAN DEFAULT false,
  UNIQUE (user_a_id, user_b_id)
);
CREATE INDEX idx_gm_matches_a ON greekmatch_matches(user_a_id);
CREATE INDEX idx_gm_matches_b ON greekmatch_matches(user_b_id);

-- Messages within a match
CREATE TABLE greekmatch_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES greekmatch_matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  read_at TIMESTAMPTZ
);
CREATE INDEX idx_gm_messages_match ON greekmatch_messages(match_id, sent_at DESC);

-- Blocks (persisted for safety)
CREATE TABLE greekmatch_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);

-- ── RLS for GreekMatch ───────────────────────────────────────
ALTER TABLE greekmatch_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE greekmatch_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE greekmatch_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE greekmatch_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE greekmatch_blocks ENABLE ROW LEVEL SECURITY;

-- Profiles: own profile + active profiles of other Greek members
CREATE POLICY "gm_profiles_own" ON greekmatch_profiles FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "gm_profiles_discover" ON greekmatch_profiles FOR SELECT
  USING (
    is_active = true
    AND paused = false
    AND user_id <> auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM greekmatch_blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = user_id)
         OR (b.blocker_id = user_id AND b.blocked_id = auth.uid())
    )
  );

-- Interactions: own actions only
CREATE POLICY "gm_interactions_own" ON greekmatch_interactions FOR ALL
  USING (actor_id = auth.uid());

-- Matches: both parties
CREATE POLICY "gm_matches_parties" ON greekmatch_matches FOR SELECT
  USING (user_a_id = auth.uid() OR user_b_id = auth.uid());
CREATE POLICY "gm_matches_update" ON greekmatch_matches FOR UPDATE
  USING (user_a_id = auth.uid() OR user_b_id = auth.uid());

-- Messages: match participants
CREATE POLICY "gm_messages_select" ON greekmatch_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM greekmatch_matches m
      WHERE m.id = match_id
        AND (m.user_a_id = auth.uid() OR m.user_b_id = auth.uid())
    )
  );
CREATE POLICY "gm_messages_insert" ON greekmatch_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM greekmatch_matches m
      WHERE m.id = match_id
        AND (m.user_a_id = auth.uid() OR m.user_b_id = auth.uid())
        AND m.user_a_unmatched = false
        AND m.user_b_unmatched = false
    )
  );

-- Blocks: own only
CREATE POLICY "gm_blocks_own" ON greekmatch_blocks FOR ALL
  USING (blocker_id = auth.uid());
