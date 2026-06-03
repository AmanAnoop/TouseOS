-- ClubOS: semester service goals and officer elections

CREATE TABLE IF NOT EXISTS club_service_goals (
  org_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  semester_label TEXT NOT NULL DEFAULT 'Current semester',
  target_hours NUMERIC(8,2) NOT NULL DEFAULT 100,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE club_service_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "club_service_goals_select" ON club_service_goals;
CREATE POLICY "club_service_goals_select" ON club_service_goals FOR SELECT USING (is_org_member(org_id));
DROP POLICY IF EXISTS "club_service_goals_officer" ON club_service_goals;
CREATE POLICY "club_service_goals_officer" ON club_service_goals FOR ALL USING (is_org_officer(org_id));

CREATE TABLE IF NOT EXISTS club_elections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('draft','open','closed')),
  opens_at TIMESTAMPTZ,
  closes_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_club_elections_org ON club_elections(org_id, status);

ALTER TABLE club_elections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "club_elections_select" ON club_elections;
CREATE POLICY "club_elections_select" ON club_elections FOR SELECT USING (is_org_member(org_id));
DROP POLICY IF EXISTS "club_elections_officer" ON club_elections;
CREATE POLICY "club_elections_officer" ON club_elections FOR ALL USING (is_org_officer(org_id));

CREATE TABLE IF NOT EXISTS club_election_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES club_elections(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id UUID REFERENCES member_profiles(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  statement TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_club_election_candidates ON club_election_candidates(election_id);

ALTER TABLE club_election_candidates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "club_election_candidates_select" ON club_election_candidates;
CREATE POLICY "club_election_candidates_select" ON club_election_candidates FOR SELECT USING (is_org_member(org_id));
DROP POLICY IF EXISTS "club_election_candidates_officer" ON club_election_candidates;
CREATE POLICY "club_election_candidates_officer" ON club_election_candidates FOR ALL USING (is_org_officer(org_id));

CREATE TABLE IF NOT EXISTS club_election_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES club_elections(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  voter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES club_election_candidates(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (election_id, voter_user_id)
);

ALTER TABLE club_election_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "club_election_votes_select" ON club_election_votes;
CREATE POLICY "club_election_votes_select" ON club_election_votes FOR SELECT USING (is_org_member(org_id));
DROP POLICY IF EXISTS "club_election_votes_insert" ON club_election_votes;
CREATE POLICY "club_election_votes_insert" ON club_election_votes FOR INSERT WITH CHECK (is_org_member(org_id));

-- Sports travel child tables (RLS via parent trip)
ALTER TABLE sports_trip_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports_travel_roster ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sports_trip_costs_select" ON sports_trip_costs;
CREATE POLICY "sports_trip_costs_select" ON sports_trip_costs FOR SELECT USING (
  EXISTS (SELECT 1 FROM sports_travel_trips t WHERE t.id = trip_id AND is_org_member(t.org_id))
);
DROP POLICY IF EXISTS "sports_trip_costs_write" ON sports_trip_costs;
CREATE POLICY "sports_trip_costs_write" ON sports_trip_costs FOR ALL USING (
  EXISTS (SELECT 1 FROM sports_travel_trips t WHERE t.id = trip_id AND is_org_officer(t.org_id))
);

DROP POLICY IF EXISTS "sports_travel_roster_select" ON sports_travel_roster;
CREATE POLICY "sports_travel_roster_select" ON sports_travel_roster FOR SELECT USING (
  EXISTS (SELECT 1 FROM sports_travel_trips t WHERE t.id = trip_id AND is_org_member(t.org_id))
);
DROP POLICY IF EXISTS "sports_travel_roster_write" ON sports_travel_roster;
CREATE POLICY "sports_travel_roster_write" ON sports_travel_roster FOR ALL USING (
  EXISTS (SELECT 1 FROM sports_travel_trips t WHERE t.id = trip_id AND is_org_officer(t.org_id))
);
