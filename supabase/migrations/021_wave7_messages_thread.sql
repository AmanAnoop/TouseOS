-- Allow string thread IDs for interchapter DMs (interchapter:orgA:orgB)
ALTER TABLE messages
  ALTER COLUMN thread_id TYPE TEXT USING thread_id::text;
