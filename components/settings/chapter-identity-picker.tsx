"use client";

import { useMemo } from "react";
import { Select } from "@/components/ui";
import { applyChapterTheme, resolveChapterColors } from "@/lib/chapter-theme";
import { GREEK_LETTER_ORGS, getGreekOrgById, greekOrgsForKind } from "@/lib/greek-letter-orgs";
import { UNIVERSITY_PRESETS, getUniversityById } from "@/lib/university-colors";

export interface ChapterIdentityValue {
  universityId: string;
  greekAffiliationId: string;
  primaryColor: string;
  secondaryColor: string;
}

interface ChapterIdentityPickerProps {
  orgType: string;
  value: ChapterIdentityValue;
  disabled?: boolean;
  onChange: (next: ChapterIdentityValue) => void;
}

export function ChapterIdentityPicker({
  orgType,
  value,
  disabled,
  onChange,
}: ChapterIdentityPickerProps) {
  const isGreek = orgType === "fraternity" || orgType === "sorority";
  const greekOptions = useMemo(() => greekOrgsForKind(orgType as "fraternity" | "sorority"), [orgType]);

  const preview = useMemo(() => {
    const greekOrg = getGreekOrgById(value.greekAffiliationId);
    const university = getUniversityById(value.universityId);
    return resolveChapterColors({
      greekOrg: greekOrg?.id === "custom" ? undefined : greekOrg,
      university: university?.id === "custom-campus" ? undefined : university,
      primaryColor: value.primaryColor,
      secondaryColor: value.secondaryColor,
    });
  }, [value]);

  function emit(next: Partial<ChapterIdentityValue>) {
    const merged = { ...value, ...next };
    const greekOrg = getGreekOrgById(merged.greekAffiliationId);
    const university = getUniversityById(merged.universityId);

    let primaryColor = merged.primaryColor;
    let secondaryColor = merged.secondaryColor;

    if (greekOrg && greekOrg.id !== "custom") {
      primaryColor = greekOrg.primary;
      secondaryColor = greekOrg.secondary;
    }

    const resolved = resolveChapterColors({
      greekOrg: greekOrg?.id === "custom" ? undefined : greekOrg,
      university: university?.id === "custom-campus" ? undefined : university,
      primaryColor,
      secondaryColor,
    });

    const out: ChapterIdentityValue = {
      ...merged,
      primaryColor: resolved.primary,
      secondaryColor: resolved.secondary,
    };

    applyChapterTheme({
      greekOrg: greekOrg?.id === "custom" ? undefined : greekOrg,
      university: university?.id === "custom-campus" ? undefined : university,
      primaryColor: out.primaryColor,
      secondaryColor: out.secondaryColor,
    });

    onChange(out);
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface-1/50 p-4">
      <div>
        <h3 className="font-serif text-base font-semibold text-foreground">Chapter identity & colors</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Regal navy & racing green base, blended with your university and {isGreek ? "national organization" : "campus"} colors.
        </p>
      </div>

      <Select
        label="University / campus"
        value={value.universityId}
        disabled={disabled}
        onChange={(e) => emit({ universityId: e.target.value })}
        options={[
          { value: "", label: "Select university…" },
          ...UNIVERSITY_PRESETS.map((u) => ({ value: u.id, label: u.name })),
        ]}
      />

      {isGreek && (
        <Select
          label={orgType === "sorority" ? "Sorority" : "Fraternity"}
          value={value.greekAffiliationId}
          disabled={disabled}
          onChange={(e) => emit({ greekAffiliationId: e.target.value })}
          options={[
            { value: "", label: "Select organization…" },
            ...greekOptions.map((g) => ({
              value: g.id,
              label: `${g.letters} — ${g.name}`,
            })),
          ]}
        />
      )}

      <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
        <div
          className="h-12 w-12 rounded-lg border border-border shadow-card"
          style={{ background: `linear-gradient(135deg, ${preview.primary} 0%, ${preview.secondary} 100%)` }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Live theme preview</p>
          <p className="text-xs font-mono text-muted-foreground truncate">
            {preview.primary} · {preview.secondary}
          </p>
        </div>
        <div className="flex gap-1">
          <span className="w-4 h-4 rounded-full border border-border" style={{ background: preview.primary }} title="Primary" />
          <span className="w-4 h-4 rounded-full border border-border" style={{ background: preview.secondary }} title="Secondary" />
        </div>
      </div>

      {value.greekAffiliationId === "custom" && (
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-sm font-medium">
            Custom primary
            <input
              type="color"
              className="mt-1 h-10 w-full rounded-lg border border-border cursor-pointer"
              value={value.primaryColor}
              disabled={disabled}
              onChange={(e) => emit({ primaryColor: e.target.value })}
            />
          </label>
          <label className="text-sm font-medium">
            Custom secondary
            <input
              type="color"
              className="mt-1 h-10 w-full rounded-lg border border-border cursor-pointer"
              value={value.secondaryColor}
              disabled={disabled}
              onChange={(e) => emit({ secondaryColor: e.target.value })}
            />
          </label>
        </div>
      )}

      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer hover:text-foreground">
          View all {GREEK_LETTER_ORGS.length} fraternity & sorority presets
        </summary>
        <p className="mt-2">
          Full reference list: <code className="text-foreground">docs/greek-letter-org-colors.md</code>
        </p>
      </details>
    </div>
  );
}
