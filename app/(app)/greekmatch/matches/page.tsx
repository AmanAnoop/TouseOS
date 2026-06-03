"use client";

import { useState, useEffect, useRef } from "react";
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
  unread: boolean;
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

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const res = await fetch("/api/greekmatch/matches");
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const enriched = await res.json();
      setMatches((enriched ?? []) as Match[]);
      setLoading(false);
    }
    init();
  }, [supabase]);

  useEffect(() => {
    if (!selectedMatch?.id) return;
    async function loadMessages() {
      const res = await fetch(`/api/greekmatch/messages?match_id=${encodeURIComponent(selectedMatch!.id)}`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages((data ?? []) as Message[]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
    loadMessages();

    // Subscribe to real-time messages
    const channel = supabase
      .channel(`match:${selectedMatch.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "greekmatch_messages",
        filter: `match_id=eq.${selectedMatch.id}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedMatch, supabase]);

  async function sendMessage() {
    if (!newMsg.trim() || !selectedMatch || !userId) return;
    setSending(true);
    const res = await fetch("/api/greekmatch/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId: selectedMatch.id, body: newMsg.trim() }),
    });
    if (res.ok) setNewMsg("");
    setSending(false);
  }

  async function unmatch(matchId: string) {
    const res = await fetch("/api/greekmatch/matches", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, unmatched: true }),
    });
    if (!res.ok) return;
    setMatches((prev) => prev.filter((m) => m.id !== matchId));
    setSelectedMatch(null);
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>;
  }

  return (
    <div className="flex h-[calc(100vh-120px)] gap-0 -mx-4 sm:-mx-6 border-t border-border mt-4">
      {/* Matches sidebar */}
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
                    <Button className="bg-gradient-to-r from-pink-500 to-rose-500" size="sm">Discover</Button>
                  </Link>
                }
              />
            </div>
          ) : matches.map((match) => (
            <button
              key={match.id}
              onClick={() => setSelectedMatch(match)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-1 transition-colors text-left ${selectedMatch?.id === match.id ? "bg-surface-1 border-l-2 border-rose-500" : ""}`}
            >
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white font-bold">
                  {match.display_name[0]?.toUpperCase()}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-background" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm text-foreground">{match.display_name}</p>
                  {match.unread && <div className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {match.last_message ?? "Matched! Say hello 👋"}
                </p>
                {match.org_name && (
                  <p className="text-xs text-rose-500">{match.org_name}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      {selectedMatch ? (
        <div className="flex-1 flex flex-col">
          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card flex-shrink-0">
            <button onClick={() => setSelectedMatch(null)} className="sm:hidden text-muted-foreground hover:text-foreground">
              <ArrowLeft size={18} />
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {selectedMatch.display_name[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm">{selectedMatch.display_name}</p>
              {selectedMatch.org_name && <p className="text-xs text-muted-foreground">{selectedMatch.org_name}</p>}
            </div>
            <button
              onClick={() => { if (window.confirm("Unmatch?")) unmatch(selectedMatch.id); }}
              className="text-xs text-muted-foreground hover:text-red-500"
            >
              Unmatch
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                <div className="flex items-center justify-center gap-2 text-rose-500 mb-2">
                  <Heart size={20} className="fill-rose-500" />
                  <Heart size={28} className="fill-rose-500" />
                  <Heart size={20} className="fill-rose-500" />
                </div>
                <p className="font-semibold text-foreground">You matched with {selectedMatch.display_name}!</p>
                <p className="text-sm text-muted-foreground">Say something nice 👋</p>
              </div>
            )}
            {messages.map((msg) => {
              const isMine = msg.sender_id === userId;
              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  {!isMine && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 self-end">
                      {selectedMatch.display_name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm ${
                    isMine
                      ? "bg-rose-500 text-white rounded-br-md"
                      : "bg-surface-1 text-foreground rounded-bl-md"
                  }`}>
                    {msg.body}
                    <p className={`text-[10px] mt-0.5 ${isMine ? "text-white/70" : "text-muted-foreground"}`}>
                      {new Date(msg.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Message input */}
          <div className="px-4 py-3 border-t border-border bg-card flex-shrink-0">
            <div className="flex items-center gap-2">
              <input
                className="flex-1 h-10 rounded-full border border-border bg-surface-1 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                placeholder={`Message ${selectedMatch.display_name}...`}
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              />
              <button
                onClick={sendMessage}
                disabled={!newMsg.trim() || sending}
                className="w-10 h-10 rounded-full bg-rose-500 hover:bg-rose-600 disabled:opacity-50 flex items-center justify-center text-white transition-colors flex-shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden sm:flex flex-1 items-center justify-center text-center p-8">
          <div>
            <Heart size={40} className="text-rose-300 mx-auto mb-3" />
            <p className="font-semibold text-foreground">Select a match</p>
            <p className="text-sm text-muted-foreground mt-1">Choose a match from the list to start chatting</p>
          </div>
        </div>
      )}
    </div>
  );
}
