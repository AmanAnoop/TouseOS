-- Extend coaching_notes for player availability tracking

ALTER TABLE coaching_notes DROP CONSTRAINT IF EXISTS coaching_notes_note_type_check;
ALTER TABLE coaching_notes ADD CONSTRAINT coaching_notes_note_type_check
  CHECK (note_type IN ('practice', 'game', 'goal', 'availability'));
