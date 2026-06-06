"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui";

interface Suggestion {
  address: string;
  placeName: string;
}

interface AddressAutocompleteProps {
  label: string;
  value: string;
  venueValue?: string;
  onSelect: (place: { address: string; venueName: string }) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function AddressAutocomplete({
  label, value, venueValue, onSelect, disabled, placeholder,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
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

  function search(q: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/locations/geocode?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions((data.suggestions ?? []) as Suggestion[]);
        setOpen(true);
      }
    }, 280);
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <Input
        label={label}
        icon={<MapPin size={15} />}
        placeholder={placeholder ?? "Start typing an address…"}
        value={query}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value);
          search(e.target.value);
        }}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
      />
      {open && suggestions.length > 0 && (
        <ul
          className="ds-card"
          style={{
            position: "absolute", zIndex: 40, top: "100%", left: 0, right: 0,
            margin: "4px 0 0", padding: 4, listStyle: "none", maxHeight: 220, overflowY: "auto",
          }}
        >
          {suggestions.map((s) => (
            <li key={s.address}>
              <button
                type="button"
                className="type-small"
                style={{
                  width: "100%", textAlign: "left", padding: "10px 12px", minHeight: 44,
                  border: "none", background: "transparent", cursor: "pointer", borderRadius: 6,
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect({ address: s.address, venueName: s.placeName || venueValue || "" });
                  setQuery(s.address);
                  setOpen(false);
                }}
              >
                <strong style={{ display: "block" }}>{s.placeName}</strong>
                <span style={{ color: "var(--color-text-muted)" }}>{s.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
