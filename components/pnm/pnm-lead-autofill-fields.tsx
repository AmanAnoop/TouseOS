"use client";

import { useMemo, useState } from "react";
import { Select } from "@/components/ui";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { HometownField } from "@/components/forms/hometown-field";
import { CLASS_YEAR_OPTIONS } from "@/lib/academic-fields";
import { majorsForUniversity } from "@/lib/university-majors";
import { REFERRAL_SOURCE_OPTIONS } from "@/lib/pnm-config";
import { Avatar } from "@/components/ui";

export interface PnmLeadAutofillValues {
  classYear: string;
  major: string;
  hometown: string;
  referralSource: string;
  activeMemberConnections: string[];
}

interface PnmLeadAutofillFieldsProps {
  values: PnmLeadAutofillValues;
  onChange: (patch: Partial<PnmLeadAutofillValues>) => void;
  members: Array<{ id: string; full_name: string; profile_photo_url?: string | null }>;
  universityId?: string | null;
}

export function PnmLeadAutofillFields({ values, onChange, members, universityId }: PnmLeadAutofillFieldsProps) {
  const majorOptions = majorsForUniversity(universityId);
  const [memberSearch, setMemberSearch] = useState("");

  const referralOptions = useMemo(
    () => REFERRAL_SOURCE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    [],
  );

  const filteredMembers = members.filter((m) => {
    const q = memberSearch.trim().toLowerCase();
    if (q.length < 2) return false;
    return m.full_name.toLowerCase().includes(q);
  }).slice(0, 8);

  function toggleMember(id: string) {
    const next = values.activeMemberConnections.includes(id)
      ? values.activeMemberConnections.filter((x) => x !== id)
      : [...values.activeMemberConnections, id];
    onChange({ activeMemberConnections: next });
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <Select
        label="Class year"
        value={values.classYear}
        onChange={(e) => onChange({ classYear: e.target.value })}
        options={[{ value: "", label: "Select year…" }, ...CLASS_YEAR_OPTIONS]}
      />
      <SearchableCombobox
        label="Major"
        value={values.major}
        options={majorOptions}
        onChange={(major) => onChange({ major })}
        placeholder="Search majors…"
        strict
      />
      <HometownField
        value={values.hometown}
        onChange={(hometown) => onChange({ hometown })}
        className="col-span-2"
      />
      <SearchableCombobox
        label="Referral source"
        value={values.referralSource}
        options={referralOptions}
        onChange={(referralSource) => onChange({ referralSource })}
        placeholder="Select or type…"
        strict={false}
      />
      <div className="col-span-2 ds-field">
        <label className="type-label">Active member connection</label>
        <input
          className="ds-input"
          placeholder="Type 2+ characters to search members…"
          value={memberSearch}
          onChange={(e) => setMemberSearch(e.target.value)}
        />
        {filteredMembers.length > 0 && (
          <ul className="ds-autocomplete-list" style={{ position: "relative" }}>
            {filteredMembers.map((m) => (
              <li key={m.id}>
                <button type="button" className="ds-autocomplete-item" onClick={() => toggleMember(m.id)}>
                  <span className="ds-member-identity" style={{ gap: 8 }}>
                    <Avatar name={m.full_name} src={m.profile_photo_url} size="sm" />
                    {m.full_name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {values.activeMemberConnections.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {values.activeMemberConnections.map((id) => {
              const m = members.find((x) => x.id === id);
              return (
                <button key={id} type="button" className="ds-chip" onClick={() => toggleMember(id)}>
                  {m?.full_name ?? "Member"} ×
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
