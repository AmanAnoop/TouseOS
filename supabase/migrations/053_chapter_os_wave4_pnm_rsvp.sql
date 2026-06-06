-- Chapter OS wave 4: PNM event invite RSVP tokens and check-in

ALTER TABLE event_pnm_invites
  ADD COLUMN IF NOT EXISTS invite_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  ADD COLUMN IF NOT EXISTS rsvp_status TEXT DEFAULT 'pending'
    CHECK (rsvp_status IN ('pending', 'going', 'maybe', 'declined')),
  ADD COLUMN IF NOT EXISTS rsvp_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_event_pnm_invites_token ON event_pnm_invites(invite_token);

UPDATE event_pnm_invites
SET invite_token = encode(gen_random_bytes(16), 'hex')
WHERE invite_token IS NULL;
