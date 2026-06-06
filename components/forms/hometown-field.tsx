"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui";

interface HometownFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function HometownField({
  label = "Hometown",
  value,
  onChange,
  placeholder = "Austin, TX",
  className,
}: HometownFieldProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Array<{ label: string; value: string }>>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  function scheduleSearch(text: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (text.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      const res = await fetch(`/api/places/autocomplete?q=${encodeURIComponent(text.trim())}`);
      const data = await res.json();
      setSuggestions((data.places ?? []) as Array<{ label: string; value: string }>);
      setOpen(true);
    }, 280);
  }

  return (
    <div ref={wrapRef} className={`relative ${className ?? ""}`}>
      <Input
        label={label}
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          onChange(next);
          scheduleSearch(next);
        }}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-background shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((s) => (
            <li key={s.value}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-surface-1"
                onClick={() => {
                  setQuery(s.value);
                  onChange(s.value);
                  setOpen(false);
                }}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
