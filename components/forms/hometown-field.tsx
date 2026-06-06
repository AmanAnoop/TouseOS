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
          scheduleSearch(next);
        }}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="ds-autocomplete-list" style={{ top: "100%", marginTop: 0 }}>
          {suggestions.map((s) => (
            <li key={s.value} role="option">
              <button
                type="button"
                className="ds-autocomplete-item"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setQuery(s.label);
                  onChange(s.label);
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
