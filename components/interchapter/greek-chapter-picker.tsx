"use client";

import { useEffect, useState } from "react";
import { Input, Select } from "@/components/ui";

export interface GreekChapterOption {
  id: string;
  name: string;
  campus: string | null;
  type?: string;
}

interface GreekChapterPickerProps {
  orgId: string | null;
  value: string;
  onChange: (orgId: string, org?: GreekChapterOption) => void;
  kindFilter?: "all" | "fraternity" | "sorority";
  placeholder?: string;
  label?: string;
}

export function GreekChapterPicker({
  orgId,
  value,
  onChange,
  kindFilter = "all",
  placeholder = "Name or campus...",
  label = "Search chapters",
}: GreekChapterPickerProps) {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState(kindFilter);
  const [options, setOptions] = useState<GreekChapterOption[]>([]);

  useEffect(() => {
    setKind(kindFilter);
  }, [kindFilter]);

  useEffect(() => {
    if (!orgId) return;
    const timer = setTimeout(() => {
      const q = search.trim();
      const params = new URLSearchParams({ exclude_org_id: orgId });
      if (q) params.set("q", q);
      if (kind !== "all") params.set("kind", kind);
      fetch(`/api/interchapter/orgs?${params}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((list) => setOptions(list as GreekChapterOption[]));
    }, 250);
    return () => clearTimeout(timer);
  }, [orgId, search, kind]);

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <Input
          label={label}
          placeholder={placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          label="Chapter type"
          value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}
          options={[
            { value: "all", label: "All chapters" },
            { value: "fraternity", label: "Fraternities" },
            { value: "sorority", label: "Sororities" },
          ]}
        />
      </div>
      <Select
        label="Select chapter"
        value={value}
        onChange={(e) => {
          const id = e.target.value;
          const org = options.find((o) => o.id === id);
          onChange(id, org);
        }}
        options={[
          { value: "", label: options.length ? "Choose a chapter" : "Search to find chapters" },
          ...options.map((o) => ({
            value: o.id,
            label: o.campus ? `${o.name} · ${o.campus}` : o.name,
          })),
        ]}
      />
    </div>
  );
}
