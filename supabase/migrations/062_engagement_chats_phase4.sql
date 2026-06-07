-- Phase 4: Chapter group chats, DMs, reactions, read state

CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  room_type TEXT NOT NULL DEFAULT 'group' CHECK (room_type IN ('group', 'dm')),
  dm_user_ids UUID[] DEFAULT '{}',
  layout TEXT NOT NULL DEFAULT 'chat' CHECK (layout IN ('chat', 'wall')),
  announcements_only BOOLEAN DEFAULT false,
  screenshot_alerts BOOLEAN DEFAULT true,
  screenshots_disabled BOOLEAN DEFAULT false,
  accent_color TEXT,
  image_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_rooms_org ON chat_rooms(org_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS chat_room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT,
  muted BOOLEAN DEFAULT false,
  pinned_to_top BOOLEAN DEFAULT false,
  timeout_until TIMESTAMPTZ,
  last_read_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_room_members_user ON chat_room_members(user_id, org_id);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name TEXT,
  body TEXT NOT NULL,
  parent_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  attachment_url TEXT,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_parent ON chat_messages(parent_id);

CREATE TABLE IF NOT EXISTS chat_message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (message_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_message_reads (
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_screenshot_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT,
  preview_storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_screenshot_alerts_room ON chat_screenshot_alerts(room_id, created_at DESC);

ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_screenshot_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_rooms_member_select" ON chat_rooms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_room_members m
      WHERE m.room_id = chat_rooms.id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "chat_rooms_member_insert" ON chat_rooms FOR INSERT
  WITH CHECK (is_org_member(org_id));

CREATE POLICY "chat_rooms_officer_update" ON chat_rooms FOR UPDATE
  USING (is_org_officer(org_id));

CREATE POLICY "chat_room_members_select" ON chat_room_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_room_members me
      WHERE me.room_id = chat_room_members.room_id AND me.user_id = auth.uid()
    )
  );

CREATE POLICY "chat_room_members_manage" ON chat_room_members FOR ALL
  USING (
    is_org_officer(org_id)
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM chat_room_members me
      WHERE me.room_id = chat_room_members.room_id AND me.user_id = auth.uid()
    )
  );

CREATE POLICY "chat_messages_select" ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_room_members m
      WHERE m.room_id = chat_messages.room_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "chat_messages_insert" ON chat_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM chat_room_members m
      WHERE m.room_id = room_id AND m.user_id = auth.uid()
        AND (m.timeout_until IS NULL OR m.timeout_until < now())
    )
  );

CREATE POLICY "chat_messages_delete_officer" ON chat_messages FOR DELETE
  USING (is_org_officer(org_id) OR sender_id = auth.uid());

CREATE POLICY "chat_messages_update" ON chat_messages FOR UPDATE
  USING (
    sender_id = auth.uid() OR is_org_officer(org_id)
  );

CREATE POLICY "chat_reactions_all" ON chat_message_reactions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM chat_messages msg
      JOIN chat_room_members m ON m.room_id = msg.room_id
      WHERE msg.id = chat_message_reactions.message_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "chat_reads_all" ON chat_message_reads FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "chat_screenshot_alerts_insert" ON chat_screenshot_alerts FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_org_member(org_id));

CREATE POLICY "chat_screenshot_alerts_officer_select" ON chat_screenshot_alerts FOR SELECT
  USING (is_org_officer(org_id) OR user_id = auth.uid());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_message_reactions;
