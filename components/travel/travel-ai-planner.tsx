"use client";

import { useState } from "react";
import { Sparkles, Wand2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Card, CardHeader, Textarea, Input } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import type { TravelProduct } from "@/lib/travel-config";

export interface TravelAiPlan {
  tripName?: string;
  tripType?: string;
  destination?: string;
  departureLocation?: string;
  venueName?: string;
  startDate?: string;
  endDate?: string;
  estimatedAttendees?: number;
  itinerarySummary?: string;
  checklist?: string[];
  budgetLineItems?: Array<{ category: string; label: string; estimatedAmount: number }>;
  perPersonEstimate?: number;
  tips?: string[];
}

interface TravelAiPlannerProps {
  orgId: string | null;
  product: TravelProduct;
  onApply: (plan: TravelAiPlan) => void;
}

export function TravelAiPlanner({ orgId, product, onApply }: TravelAiPlannerProps) {
  const [prompt, setPrompt] = useState("");
  const [attendees, setAttendees] = useState("20");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<TravelAiPlan | null>(null);

  async function generate() {
    if (!orgId || !prompt.trim()) return;
    setLoading(true);
    setPlan(null);
    const res = await fetch("/api/travel/ai-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        prompt,
        product,
        attendeeCount: parseInt(attendees, 10) || 20,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error ?? data.hint ?? "Could not generate plan");
      return;
    }
    setPlan(data.plan as TravelAiPlan);
    toast.success("Travel plan ready — review and apply");
  }

  const examples = product === "greek"
    ? [
        "Spring formal in Austin for 80 members, bus from College Station, hotel block downtown",
        "Brotherhood retreat at Lake Travis, 2 nights, team-building activities",
      ]
    : [
        "Away tournament in Columbus OH, 22 players, 2-night hotel, van rental from campus",
        "Regional championship weekend, flights + equipment transport",
      ];

  return (
    <Card className="border-greek-200 dark:border-greek-900 bg-gradient-to-br from-greek-50/80 to-transparent dark:from-greek-950/20">
      <CardHeader
        title="AI travel planner"
        description="Describe your trip — get itinerary, checklist, and budget estimates"
        icon={<Sparkles size={16} className="text-greek-600" />}
      />
      <div className="space-y-3">
        <Textarea
          label="What are you planning?"
          placeholder={examples[0]}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
        />
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-36">
            <Input
              label={product === "greek" ? "Attendees" : "Players"}
              type="number"
              min={1}
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
            />
          </div>
          <Button
            icon={<Wand2 size={14} />}
            loading={loading}
            disabled={!prompt.trim() || !orgId}
            onClick={generate}
          >
            Generate plan
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              className="text-xs px-2.5 py-1 rounded-full border border-border bg-surface-1 hover:bg-surface-2 text-muted-foreground text-left"
              onClick={() => setPrompt(ex)}
            >
              {ex.slice(0, 52)}…
            </button>
          ))}
        </div>

        {plan && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="font-semibold text-foreground">{plan.tripName ?? "Suggested trip"}</p>
                <p className="text-sm text-muted-foreground mt-1">{plan.itinerarySummary}</p>
              </div>
              {plan.perPersonEstimate != null && (
                <p className="text-sm font-mono font-medium">
                  ~{formatCurrency(plan.perPersonEstimate)}/person
                </p>
              )}
            </div>
            {Array.isArray(plan.checklist) && plan.checklist.length > 0 && (
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                {plan.checklist.slice(0, 6).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {Array.isArray(plan.budgetLineItems) && plan.budgetLineItems.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-2">
                {plan.budgetLineItems.slice(0, 4).map((row) => (
                  <div key={row.label} className="text-xs flex justify-between gap-2 p-2 rounded-lg bg-surface-1">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-mono">{formatCurrency(row.estimatedAmount ?? 0)}</span>
                  </div>
                ))}
              </div>
            )}
            <Button size="sm" onClick={() => { onApply(plan); toast.success("Applied to new trip form"); }}>
              Use this plan → create trip
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
