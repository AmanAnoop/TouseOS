"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Button, Card, CardHeader, Input } from "@/components/ui";

interface InterestsEditorProps {
  memberId: string;
  initialInterests: string[];
  title?: string;
}

export function InterestsEditor({ memberId, initialInterests, title = "Your interests" }: InterestsEditorProps) {
  const [text, setText] = useState(initialInterests.join(", "));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const interests = text.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    const res = await fetch("/api/members/interests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, interests }),
    });
    setSaving(false);
    if (res.ok) toast.success("Interests saved — improves rush matching");
    else {
      const err = await res.json();
      toast.error(err.error ?? "Failed to save");
    }
  }

  return (
    <Card>
      <CardHeader title={title} description="Used for PNM–brother rush matching (comma-separated)" />
      <Input
        label="Interests"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="basketball, finance, philanthropy…"
      />
      <div className="mt-3">
        <Button size="sm" onClick={save} loading={saving}>Save interests</Button>
      </div>
    </Card>
  );
}
