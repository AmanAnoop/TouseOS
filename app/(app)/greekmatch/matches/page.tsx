"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Heart, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button, EmptyState, Spinner } from "@/components/ui";

interface Match {
  id: string;
  other_user_id: string;
  display_name: string;
  photos: string[];
  org_name: string | null;
  last_message: string | null;
  last_message_at: string | null;
}

interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  body: string;
  sent_at: string;
  read_at: string | null;
}

export default function GreekMatchMatchesPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMatches = useCallback(async () => {
    const res = await fetch("/api/greekmatch/matches/enriched");
    if (res.ok) setMatches((await res.json()) as Match[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
      loadMatches();
    });
  }, [supabase, loadMatches]);

  const loadMessages = useCallback(async (matchId: string) => {
    const res = await fetch(`/api/greekmatch/matches/${matchId}/messages`);
    if (res.ok) {
      setMessages((await res.json()) as Message[]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, []);

  useEffect(() => {
    if (!selectedMatch?.id) return;
    loadMessages(selectedMatch.id);

    const channel = supabase
      .channel(`match:${selectedMatch.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "greekmatch_messages",
          filter: `match_id=eq.${selectedMatch.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedMatch, supabase, loadMessages]);

  async function sendMessage() {
    if (!newMsg.trim() || !selectedMatch) return;
    setSending(true);
    const res = await fetch(`/api/greekmatch/matches/${selectedMatch.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: newMsg.trim() }),
    });
    setSending(false);
    if (res.ok) {
      setNewMsg("");
      loadMessages(selectedMatch.id);
      loadMatches();
    }
  }

  async function unmatch(matchId: string) {
    const res = await fetch(`/api/greekmatch/matches/${matchId}`, { method: "PATCH" });
    if (res.ok) {
      setMatches((prev) => prev.filter((m) => m.id !== matchId));
      setSelectedMatch(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] gap-0 -mx-4 sm:-mx-6 border-t border-border mt-4">
      <div className={`w-full sm:w-80 flex-shrink-0 border-r border-border flex flex-col ${selectedMatch ? "hidden sm:flex" : "flex"}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Link href="/greekmatch" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft size={18} />
            </Link>
            <h2 className="font-semibold text-foreground">Matches</h2>
          </div>
          <Heart size={18} className="text-rose-500 fill-rose-500" />
        </div>

        <div className="flex-1 overflow-y-auto">
          {matches.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<Heart size={24} className="text-rose-400" />}
                title="No matches yet"
                description="Keep swiping to find your match!"
                action={
                  <Link href="/greekmatch">
                    <Button size="sm">
                      Discover
                    </Button>
                  </Link>
                }
              />
            </div>
          ) : (
            matches.map((match) => (
              <button
                key={match.id}
                type="button"
                onClick={() => setSelectedMatch(match)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-1 transition-colors text-left ${selectedMatch?.id === match.id ? "bg-surface-1 border-l-2 border-rose-500" : ""}`}
              >
                <div className="relative flex-shrink-0">
                  {match.photos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={match.photos[0]} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                      {match.display_name[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground">{match.display_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {match.last_message ?? "Matched! Say hello 👋"}
                  </p>
                  {match.org_name && <p className="text-[10px] text-muted-foreground">{match.org_name}</p>}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {selectedMatch ? (
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <button type="button" className="sm:hidden text-sm text-greek-600" onClick={() => setSelectedMatch(null)}>
              ← Back
            </button>
            <div>
              <p className="font-semibold">{selectedMatch.display_name}</p>
              {selectedMatch.org_name && <p className="text-xs text-muted-foreground">{selectedMatch.org_name}</p>}
            </div>
            <Button size="sm" variant="secondary" onClick={() => unmatch(selectedMatch.id)}>
              Unmatch
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => {
              const mine = msg.sender_id === userId;
              return (
                <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                      mine ? "bg-rose-500 text-white rounded-br-sm" : "bg-surface-1 text-foreground rounded-bl-sm"
                    }`}
                  >
                    {msg.body}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-border flex gap-2">
            <input
              className="flex-1 h-10 rounded-full border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Type a message..."
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            />
            <Button
              size="sm"
              className="rounded-full bg-rose-500 hover:bg-rose-600"
              loading={sending}
              onClick={sendMessage}
              icon={<Send size={14} />}
            >
              Send
            </Button>
          </div>
        </div>
      ) : (
        <div className="hidden sm:flex flex-1 items-center justify-center text-muted-foreground text-sm">
          Select a match to chat
        </div>
      )}
    </div>
  );
}
