"use client";

import { use } from "react";
import { ChatRoomClient } from "@/components/chats/chat-room-client";
import { useOrg } from "@/hooks/use-org";

export default function ChatRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const { orgId, userId, role, loading } = useOrg();

  if (loading) {
    return <div className="ds-skeleton h-64 w-full rounded-xl" />;
  }

  if (!orgId || !userId) {
    return null;
  }

  return (
    <ChatRoomClient
      roomId={roomId}
      orgId={orgId}
      userId={userId}
      role={role}
    />
  );
}
