"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface ComboboxOption {
  value: string;
  label: string;
}

interface SearchableComboboxProps {
  label: string;
  value: string;
  options: ComboboxOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** When true, only values from options are accepted (no free text). */
  strict?: boolean;
}

export function SearchableCombobox({
  label,
  value,
  options,
  onChange,
  placeholder = "Search…",
  disabled,
  strict = true,
}: SearchableComboboxProps) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    setQuery(selected?.label ?? "");
  }, [selected?.label]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (strict && !options.some((o) => o.value === value)) {
          setQuery(selected?.label ?? "");
        }
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [strict, value, options, selected?.label]);

  const filtered = options.filter((o) => {
    if (!o.value) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return o.label.toLowerCase().includes(q);
  });

  return (
    <div ref={wrapRef} className="ds-field">
      <label className="type-label" htmlFor={listId}>
        {label}
      </label>
      <input
        id={listId}
        className="ds-input"
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${listId}-list`}
        aria-autocomplete="list"
        disabled={disabled}
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (!strict) onChange(e.target.value);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <ul
          id={`${listId}-list`}
          role="listbox"
          className="ds-autocomplete-list"
        >
          {filtered.map((opt) => (
            <li key={opt.value} role="option">
              <button
                type="button"
                className="ds-autocomplete-item"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(opt.value);
                  setQuery(opt.label);
                  setOpen(false);
                }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
