"use client";

import { useState } from "react";
import {
  BookOpen, Calendar, DollarSign, FileText,
  Loader2, MessageSquare, Send, Sparkles, User, Zap,
} from "lucide-react";
import { Button, PageHeader } from "@/components/ui";
import { useOrg } from "@/hooks/use-org";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS = [
  { icon: <Calendar size={15} />, label: "Plan an event", prompt: "Help me plan a mixer event for our fraternity. Include venue ideas, budget breakdown, timeline, and logistics checklist." },
  { icon: <MessageSquare size={15} />, label: "Write a caption", prompt: "Write 3 Instagram caption options for our recent philanthropy event where we raised $2,000 for a local food bank with 80 members attending." },
  { icon: <FileText size={15} />, label: "Draft newsletter", prompt: "Write a monthly alumni newsletter for our chapter highlighting our recent events, philanthropy efforts, and member achievements." },
  { icon: <DollarSign size={15} />, label: "Budget draft", prompt: "Help me create a semester budget for a fraternity with 60 active members. Include categories for social events, philanthropy, operations, and recruitment." },
  { icon: <User size={15} />, label: "PNM text", prompt: "Write 5 different text message templates to invite potential new members (PNMs) to our upcoming rush events. Keep them friendly, genuine, and not spammy." },
  { icon: <BookOpen size={15} />, label: "Officer transition", prompt: "Help me write an officer transition binder for the Social Chair role in a fraternity. Include key responsibilities, vendor contacts template, lessons learned, and advice for the incoming chair." },
  { icon: <Zap size={15} />, label: "Semester recap", prompt: "Summarize a typical semester for a fraternity chapter: events hosted, philanthropy raised, new members initiated, and goals for next semester. Format as a chapter report." },
  { icon: <Sparkles size={15} />, label: "Recruitment week plan", prompt: "Create a 5-day formal recruitment week schedule for a sorority including event types, themes, logistics, and what PNMs should expect each day." },
];

export default function AiAssistantPage() {
  const { orgId } = useOrg();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage(text?: string) {
    const prompt = text ?? input;
    if (!prompt.trim()) return;

    const userMsg: Message = { role: "user", content: prompt };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg], orgId: orgId ?? undefined }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "AI error");
      }

      const { response } = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to get response";
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: `I'm sorry, I couldn't process that request right now. ${message}. Add your Anthropic API key in Settings → API keys (platform admin).`,
      }]);
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-2xl mx-auto">
      <PageHeader
        title="AI Assistant"
        description="Caption generator · Event planner · Newsletter writer · Budget drafter"
      />

      {/* Disclaimer */}
      <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3 mb-4 text-xs text-yellow-800 dark:text-yellow-300">
        <strong>Important:</strong> AI suggestions are drafts only. Never use AI for final decisions on standards cases, risk approval, discipline, recruitment acceptance, or medical decisions. Always review and edit before sending.
      </div>

      {/* Quick prompts */}
      {messages.length === 0 && (
        <div className="space-y-3 mb-4">
          <p className="text-sm font-semibold text-foreground">Quick prompts</p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_PROMPTS.map((qp) => (
              <button
                key={qp.label}
                onClick={() => sendMessage(qp.prompt)}
                className="flex items-center gap-2 p-3 rounded-xl border border-border bg-card hover:border-greek-300 hover:bg-greek-50 dark:hover:bg-greek-950/20 transition-colors text-left"
              >
                <span className="text-greek-600 flex-shrink-0">{qp.icon}</span>
                <span className="text-sm font-medium text-foreground">{qp.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-greek-100 dark:bg-greek-950/50 flex items-center justify-center mr-2 flex-shrink-0 self-end">
                <Sparkles size={14} className="text-greek-600" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === "user" ? "bg-greek-600 text-white rounded-br-md" : "bg-card border border-border rounded-bl-md"}`}>
              <p className={`text-sm whitespace-pre-wrap leading-relaxed ${msg.role === "user" ? "text-white" : "text-foreground"}`}>
                {msg.content}
              </p>
              {msg.role === "assistant" && (
                <button
                  onClick={() => copyToClipboard(msg.content)}
                  className="text-[10px] text-muted-foreground hover:text-foreground mt-2 flex items-center gap-1"
                >
                  <FileText size={10} />
                  Copy
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-greek-100 dark:bg-greek-950/50 flex items-center justify-center mr-2">
              <Sparkles size={14} className="text-greek-600" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
              <Loader2 size={16} className="animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex items-end gap-2 border-t border-border pt-4">
        <textarea
          className="flex-1 min-h-[44px] max-h-32 rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          placeholder="Ask me to write a caption, plan an event, draft a newsletter..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          rows={1}
        />
        <Button
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          loading={loading}
          icon={<Send size={14} />}
          className="flex-shrink-0 h-11"
        >
          Send
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-1 text-center">
        Requires ANTHROPIC_API_KEY — set in Platform Admin → Integration keys or host environment.
      </p>
    </div>
  );
}
