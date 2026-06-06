-- Feature repairs: event poll RLS, Greek travel module tables

-- Event polls — members of the org can read/create/vote; officers manage
CREATE POLICY event_polls_select ON event_polls
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM org_members om
      JOIN events e ON e.id = event_polls.event_id
      WHERE om.org_id = e.org_id
        AND om.user_id = auth.uid()
        AND om.status <> 'removed'
    )
  );

CREATE POLICY event_polls_insert ON event_polls
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members om
      JOIN events e ON e.id = event_polls.event_id
      WHERE om.org_id = e.org_id
        AND om.user_id = auth.uid()
        AND om.status <> 'removed'
        AND om.role IN (
          'owner','president','vice_president','treasurer','secretary',
          'social_chair','recruitment_chair','risk_manager','philanthropy_chair',
          'nme_chair','pr_chair','advisor','captain','co_captain','coach'
        )
    )
  );

CREATE POLICY event_polls_update ON event_polls
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM org_members om
      JOIN events e ON e.id = event_polls.event_id
      WHERE om.org_id = e.org_id
        AND om.user_id = auth.uid()
        AND om.status <> 'removed'
    )
  );

CREATE POLICY event_polls_delete ON event_polls
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM org_members om
      JOIN events e ON e.id = event_polls.event_id
      WHERE om.org_id = e.org_id
        AND om.user_id = auth.uid()
        AND om.status <> 'removed'
        AND om.role IN (
          'owner','president','vice_president','treasurer','secretary',
          'social_chair','recruitment_chair','risk_manager','philanthropy_chair',
          'nme_chair','pr_chair','advisor','captain','co_captain','coach'
        )
    )
  );

-- Greek OS travel management
CREATE TABLE greek_travel_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'other',
  destination TEXT,
  departure_location TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  estimated_attendees INT DEFAULT 0,
  visibility TEXT DEFAULT 'all_members' CHECK (visibility IN ('all_members','exec_only')),
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning','confirmed','in_progress','completed','cancelled')),
  total_budget NUMERIC(12,2) DEFAULT 0,
  amount_collected NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_greek_travel_trips_org ON greek_travel_trips(org_id, start_date);

CREATE TABLE greek_trip_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES greek_travel_trips(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'no_response' CHECK (status IN ('attending','not_attending','no_response')),
  dietary_notes TEXT,
  payment_status TEXT DEFAULT 'pending',
  UNIQUE (trip_id, member_id)
);

CREATE TABLE greek_trip_itinerary_legs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES greek_travel_trips(id) ON DELETE CASCADE,
  day INT NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  leg_type TEXT NOT NULL CHECK (leg_type IN ('transportation','accommodation','activity')),
  details JSONB NOT NULL DEFAULT '{}',
  confirmation_number TEXT,
  document_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_greek_trip_legs ON greek_trip_itinerary_legs(trip_id, day, sort_order);

CREATE TABLE greek_trip_budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES greek_travel_trips(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT,
  est_cost NUMERIC(12,2) DEFAULT 0,
  actual_cost NUMERIC(12,2) DEFAULT 0,
  paid_by UUID REFERENCES member_profiles(id) ON DELETE SET NULL,
  reimbursement_status TEXT DEFAULT 'pending'
);

CREATE TABLE greek_trip_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES greek_travel_trips(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  assigned_to UUID REFERENCES member_profiles(id) ON DELETE SET NULL,
  due_date DATE,
  complete BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0
);

CREATE TABLE greek_trip_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES greek_travel_trips(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  url TEXT NOT NULL,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE greek_trip_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  checklist_items JSONB DEFAULT '[]',
  itinerary_structure JSONB DEFAULT '[]',
  budget_categories JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE greek_travel_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE greek_trip_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE greek_trip_itinerary_legs ENABLE ROW LEVEL SECURITY;
ALTER TABLE greek_trip_budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE greek_trip_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE greek_trip_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE greek_trip_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY greek_travel_trips_org ON greek_travel_trips
  FOR ALL USING (is_org_member(org_id));

CREATE POLICY greek_trip_rsvps_org ON greek_trip_rsvps
  FOR ALL USING (
    EXISTS (SELECT 1 FROM greek_travel_trips t WHERE t.id = trip_id AND is_org_member(t.org_id))
  );

CREATE POLICY greek_trip_legs_org ON greek_trip_itinerary_legs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM greek_travel_trips t WHERE t.id = trip_id AND is_org_member(t.org_id))
  );

CREATE POLICY greek_trip_budget_org ON greek_trip_budget_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM greek_travel_trips t WHERE t.id = trip_id AND is_org_member(t.org_id))
  );

CREATE POLICY greek_trip_checklist_org ON greek_trip_checklist_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM greek_travel_trips t WHERE t.id = trip_id AND is_org_member(t.org_id))
  );

CREATE POLICY greek_trip_documents_org ON greek_trip_documents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM greek_travel_trips t WHERE t.id = trip_id AND is_org_member(t.org_id))
  );

CREATE POLICY greek_trip_templates_org ON greek_trip_templates
  FOR ALL USING (is_org_member(org_id));
