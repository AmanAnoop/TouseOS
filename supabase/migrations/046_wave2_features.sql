-- Wave 2: NME content kinds, event PNM invites, document metadata

ALTER TABLE nme_modules
  ADD COLUMN IF NOT EXISTS content_kind TEXT DEFAULT 'reading'
    CHECK (content_kind IN ('reading', 'video', 'quiz'));

CREATE TABLE IF NOT EXISTS event_pnm_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pnm_id UUID NOT NULL REFERENCES pnm_leads(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (event_id, pnm_id)
);

ALTER TABLE event_pnm_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_pnm_invites_org ON event_pnm_invites FOR ALL
  USING (is_org_member(org_id))
  WITH CHECK (is_org_officer(org_id));
