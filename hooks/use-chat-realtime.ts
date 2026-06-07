"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface UseChatRealtimeOptions {
  roomId: string | null;
  onMessage: (payload: { eventType: string; new: Record<string, unknown>; old?: Record<string, unknown> }) => void;
  onReaction?: (payload: { eventType: string; new: Record<string, unknown>; old?: Record<string, unknown> }) => void;
}

export function useChatRealtime({ roomId, onMessage, onReaction }: UseChatRealtimeOptions) {
  useEffect(() => {
    if (!roomId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`chat-room-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages", filter: `room_id=eq.${roomId}` },
        (payload) => onMessage({
          eventType: payload.eventType,
          new: payload.new as Record<string, unknown>,
          old: payload.old as Record<string, unknown> | undefined,
        }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_message_reactions" },
        (payload) => {
          if (!onReaction) return;
          onReaction({
            eventType: payload.eventType,
            new: payload.new as Record<string, unknown>,
            old: payload.old as Record<string, unknown> | undefined,
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, onMessage, onReaction]);
}
