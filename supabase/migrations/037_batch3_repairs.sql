-- Batch 3: risk metadata + governance attendee tracking

ALTER TABLE risk_checklists
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

ALTER TABLE governance_meetings
  ADD COLUMN IF NOT EXISTS attendee_ids JSONB DEFAULT '[]';
