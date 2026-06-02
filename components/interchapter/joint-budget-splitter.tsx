"use client";

import { useState } from "react";
import { DollarSign } from "lucide-react";
import { Badge, Button, Card, CardHeader, Input, Select } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

interface JointBudgetSplitterProps {
  defaultTotal?: number;
  defaultSplit?: string;
  orgAName?: string;
  orgBName?: string;
}

const SPLIT_PRESETS = [
  { value: "50/50", label: "50 / 50" },
  { value: "60/40", label: "60 / 40 (host pays more)" },
  { value: "40/60", label: "40 / 60 (guest pays more)" },
  { value: "custom", label: "Custom %" },
];

export function JointBudgetSplitter({
  defaultTotal = 0,
  defaultSplit = "50/50",
  orgAName = "Your chapter",
  orgBName = "Partner chapter",
}: JointBudgetSplitterProps) {
  const [total, setTotal] = useState(String(defaultTotal || ""));
  const [split, setSplit] = useState(defaultSplit);
  const [customPct, setCustomPct] = useState("50");

  const totalNum = parseFloat(total) || 0;
  let pctA = 50;
  if (split === "60/40") pctA = 60;
  else if (split === "40/60") pctA = 40;
  else if (split === "custom") pctA = parseFloat(customPct) || 50;

  const shareA = totalNum * (pctA / 100);
  const shareB = totalNum - shareA;

  return (
    <Card>
      <CardHeader
        title="Joint event budget splitter"
        description="Estimate cost shares before sending an interchapter proposal"
        icon={<DollarSign size={16} />}
      />
      <div className="space-y-4">
        <Input
          label="Estimated total event cost ($)"
          type="number"
          value={total}
          onChange={(e) => setTotal(e.target.value)}
          placeholder="2500"
        />
        <Select
          label="Split model"
          value={split}
          onChange={(e) => setSplit(e.target.value)}
          options={SPLIT_PRESETS}
        />
        {split === "custom" && (
          <Input
            label={`${orgAName} share (%)`}
            type="number"
            min={0}
            max={100}
            value={customPct}
            onChange={(e) => setCustomPct(e.target.value)}
          />
        )}
        {totalNum > 0 && (
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-lg border border-racing-200 bg-racing-50">
              <p className="text-xs text-muted-foreground">{orgAName}</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(shareA)}</p>
              <Badge label={`${pctA}%`} color="blue" className="mt-1" />
            </div>
            <div className="p-4 rounded-lg border border-border bg-surface-1">
              <p className="text-xs text-muted-foreground">{orgBName}</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(shareB)}</p>
              <Badge label={`${100 - pctA}%`} color="gray" className="mt-1" />
            </div>
          </div>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            const text = `Joint budget: ${formatCurrency(totalNum)} total — ${orgAName}: ${formatCurrency(shareA)} (${pctA}%), ${orgBName}: ${formatCurrency(shareB)} (${100 - pctA}%)`;
            navigator.clipboard.writeText(text);
          }}
          disabled={totalNum <= 0}
        >
          Copy split summary
        </Button>
      </div>
    </Card>
  );
}
