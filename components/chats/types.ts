export interface ChatRoomSummary {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  room_type: "group" | "dm";
  layout: "chat" | "wall";
  announcements_only: boolean;
  screenshot_alerts: boolean;
  screenshots_disabled: boolean;
  accent_color: string | null;
  image_url: string | null;
  pinned_to_top: boolean;
  muted: boolean;
  unread_count: number;
  last_message?: {
    body: string;
    sender_name: string | null;
    created_at: string;
  } | null;
}

export interface ChatReaction {
  emoji: string;
  user_id: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  org_id: string;
  sender_id: string | null;
  sender_name: string | null;
  body: string;
  parent_id: string | null;
  attachment_url: string | null;
  is_pinned: boolean;
  created_at: string;
  reactions: ChatReaction[];
  read_by: string[];
}

export interface ChatRoomMember {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  timeout_until: string | null;
  muted: boolean;
}

export interface ChatRoomDetail extends ChatRoomSummary {
  members: ChatRoomMember[];
}
