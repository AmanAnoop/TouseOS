"use client";

import { useMemo } from "react";
import { Select } from "@/components/ui";
import { applyChapterTheme, resolveChapterColors } from "@/lib/chapter-theme";
import { getGreekOrgById, greekOrgsForKind } from "@/lib/greek-letter-orgs";
import { getProductId } from "@/lib/org-product";
import { universitiesForSelect } from "@/lib/university-colors";

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
  const product = getProductId(orgType);
  const isGreek = orgType === "fraternity" || orgType === "sorority";
  const isSports = product === "sports";
  const isClub = product === "club";
  const campusOnly = isSports || isClub;
  const greekOptions = useMemo(() => greekOrgsForKind(orgType as "fraternity" | "sorority"), [orgType]);
  const uniOptions = useMemo(() => universitiesForSelect(), []);

  const preview = useMemo(() => {
    const greekOrg = getGreekOrgById(value.greekAffiliationId);
    const university = uniOptions.find((u) => u.id === value.universityId);
    return resolveChapterColors({
      product,
      greekOrg: greekOrg?.id === "custom" ? undefined : greekOrg,
      university: university?.id === "custom-campus" ? undefined : university,
      primaryColor: value.primaryColor,
      secondaryColor: value.secondaryColor,
    });
  }, [value, product, uniOptions]);

  function emit(next: Partial<ChapterIdentityValue>) {
    const merged = { ...value, ...next };
    const greekOrg = getGreekOrgById(merged.greekAffiliationId);
    const university = uniOptions.find((u) => u.id === merged.universityId);

    const resolved = resolveChapterColors({
      product,
      greekOrg: greekOrg?.id === "custom" ? undefined : greekOrg,
      university: university?.id === "custom-campus" ? undefined : university,
      primaryColor: merged.primaryColor,
      secondaryColor: merged.secondaryColor,
    });

    const universityChanged = next.universityId !== undefined;
    const colorsTouched = next.primaryColor !== undefined || next.secondaryColor !== undefined;

    const out: ChapterIdentityValue = {
      ...merged,
      primaryColor: colorsTouched
        ? (merged.primaryColor || resolved.orgPrimary)
        : universityChanged && merged.universityId && merged.universityId !== "custom-campus"
          ? resolved.campusPrimary
          : (merged.primaryColor || resolved.orgPrimary),
      secondaryColor: colorsTouched
        ? (merged.secondaryColor || resolved.orgSecondary)
        : universityChanged && merged.universityId && merged.universityId !== "custom-campus"
          ? resolved.campusSecondary
          : (merged.secondaryColor || (campusOnly ? resolved.campusSecondary : resolved.orgSecondary)),
    };

    applyChapterTheme({
      product,
      greekOrg: greekOrg?.id === "custom" ? undefined : greekOrg,
      university: university?.id === "custom-campus" ? undefined : university,
      primaryColor: out.primaryColor,
      secondaryColor: out.secondaryColor,
    });

    onChange(out);
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface-1 p-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Brand colors</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {campusOnly
            ? "Choose your club or team colors. They apply across navigation, buttons, and accents."
            : "Chapter colors for actions and navigation; campus colors for headers and accents."}
        </p>
      </div>

      <Select
        label="University / campus"
        value={value.universityId}
        disabled={disabled}
        onChange={(e) => emit({ universityId: e.target.value })}
        options={[
          { value: "", label: "Select university…" },
          ...uniOptions.map((u) => ({ value: u.id, label: u.name })),
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

      <div className="grid sm:grid-cols-2 gap-3">
        {!campusOnly && (
          <div className="p-3 rounded-lg border border-border bg-card">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Organization</p>
            <div className="flex gap-2">
              <span className="h-8 flex-1 rounded-md border border-border" style={{ background: preview.orgPrimary }} />
              <span className="h-8 flex-1 rounded-md border border-border" style={{ background: preview.orgSecondary }} />
            </div>
            <p className="text-[10px] font-mono text-muted-foreground mt-2 truncate">
              {preview.orgPrimary}
            </p>
          </div>
        )}
        <div className={`p-3 rounded-lg border border-border bg-card ${campusOnly ? "sm:col-span-2" : ""}`}>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            {campusOnly ? "Team / club colors" : "Campus"}
          </p>
          <div className="flex gap-2">
            <span className="h-8 flex-1 rounded-md border border-border" style={{ background: preview.campusPrimary }} />
            <span className="h-8 flex-1 rounded-md border border-border" style={{ background: preview.campusSecondary }} />
          </div>
          <p className="text-[10px] font-mono text-muted-foreground mt-2 truncate">
            {preview.campusPrimary}
          </p>
        </div>
      </div>

      {(campusOnly || (value.greekAffiliationId === "custom" && isGreek)) && (
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-sm font-medium text-foreground">
            {campusOnly ? "Primary color" : "Custom org primary"}
            <input
              type="color"
              className="mt-1 h-10 w-full rounded-lg border border-border cursor-pointer"
              value={value.primaryColor}
              disabled={disabled}
              onChange={(e) => emit({
                primaryColor: e.target.value,
                ...(campusOnly ? { universityId: "custom-campus" } : {}),
              })}
            />
          </label>
          <label className="text-sm font-medium text-foreground">
            {campusOnly ? "Secondary color" : "Custom org secondary"}
            <input
              type="color"
              className="mt-1 h-10 w-full rounded-lg border border-border cursor-pointer"
              value={value.secondaryColor}
              disabled={disabled}
              onChange={(e) => emit({
                secondaryColor: e.target.value,
                ...(campusOnly ? { universityId: "custom-campus" } : {}),
              })}
            />
          </label>
        </div>
      )}

      {campusOnly && (
        <p className="text-xs text-muted-foreground">
          Select a university to start from preset colors, or set primary and secondary directly. Save organization settings to apply.
        </p>
      )}
    </div>
  );
}
