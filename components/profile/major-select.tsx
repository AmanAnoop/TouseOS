"use client";

import { useEffect, useRef, useState } from "react";
import { filterMajors } from "@/lib/school-majors";
import { Input } from "@/components/ui";

interface MajorSelectProps {
  label?: string;
  value: string;
  onChange: (major: string) => void;
}

export function MajorSelect({ label = "Major", value, onChange }: MajorSelectProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function updateSuggestions(q: string) {
    setSuggestions(filterMajors(q));
    setOpen(true);
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <Input
        label={label}
        placeholder="Search majors…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          updateSuggestions(e.target.value);
        }}
        onFocus={() => updateSuggestions(query)}
      />
      {open && suggestions.length > 0 && (
        <ul
          className="ds-card"
          style={{
            position: "absolute", zIndex: 40, top: "100%", left: 0, right: 0,
            margin: "4px 0 0", padding: 4, listStyle: "none", maxHeight: 200, overflowY: "auto",
          }}
        >
          {suggestions.map((major) => (
            <li key={major}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-surface-1"
                onClick={() => {
                  onChange(major);
                  setQuery(major);
                  setOpen(false);
                }}
              >
                {major}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
