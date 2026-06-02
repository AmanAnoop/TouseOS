"use client";

import { Bell, Plus } from "lucide-react";
import { Badge, Button, Card, EmptyState } from "@/components/ui";

interface ScheduledMessage {
  id: string;
  title?: string | null;
  body: string;
  channel: string;
  scheduled_for: string;
  status: string;
}

interface ScheduledMessagesPanelProps {
  messages: ScheduledMessage[];
  onSchedule: () => void;
  onCancel: (id: string) => void;
}

export function ScheduledMessagesPanel({ messages, onSchedule, onCancel }: ScheduledMessagesPanelProps) {
  const pending = messages.filter((m) => m.status === "scheduled");

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" icon={<Plus size={14} />} onClick={onSchedule}>Schedule message</Button>
      </div>
      {pending.length === 0 ? (
        <EmptyState
          icon={<Bell size={20} />}
          title="No scheduled messages"
          description="Schedule announcements or emails to send later."
          action={<Button size="sm" onClick={onSchedule}>Schedule message</Button>}
        />
      ) : (
        <div className="space-y-2">
          {pending.map((m) => (
            <Card key={m.id} padding="sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{m.title ?? "Scheduled message"}</p>
                    <Badge label={m.channel} color="blue" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{m.scheduled_for}</p>
                  <p className="text-sm mt-1 line-clamp-2">{m.body}</p>
                </div>
                <button onClick={() => onCancel(m.id)} className="text-xs text-red-500 hover:underline flex-shrink-0">
                  Cancel
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
