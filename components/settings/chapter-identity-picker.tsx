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
  /** When true, manual color picks persist across university/org changes. */
  colorsLocked?: boolean;
  onManualColorChange?: () => void;
  onChange: (next: ChapterIdentityValue) => void;
}

export function ChapterIdentityPicker({
  orgType,
  value,
  disabled,
  colorsLocked = false,
  onManualColorChange,
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
    const greekChanged = next.greekAffiliationId !== undefined;
    const colorsTouched = next.primaryColor !== undefined || next.secondaryColor !== undefined;

    let primary = merged.primaryColor || resolved.orgPrimary;
    let secondary = merged.secondaryColor || resolved.orgSecondary;

    if (!colorsLocked && !colorsTouched) {
      if (campusOnly && universityChanged && merged.universityId && merged.universityId !== "custom-campus") {
        primary = resolved.campusPrimary;
        secondary = resolved.campusSecondary;
      } else if (isGreek && greekChanged && greekOrg && greekOrg.id !== "custom") {
        primary = resolved.orgPrimary;
        secondary = resolved.orgSecondary;
      } else if (isGreek && universityChanged && merged.universityId && merged.universityId !== "custom-campus") {
        secondary = resolved.campusSecondary;
      }
    } else if (colorsTouched) {
      primary = merged.primaryColor || resolved.orgPrimary;
      secondary = merged.secondaryColor || resolved.orgSecondary;
    }

    const out: ChapterIdentityValue = {
      ...merged,
      primaryColor: primary,
      secondaryColor: secondary,
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
    <div
      className="ds-card"
      style={{
        display: "flex", flexDirection: "column", gap: 16,
        padding: "20px 24px", background: "var(--color-bg-raised)",
      }}
    >
      <div>
        <h3 className="type-h3" style={{ margin: 0 }}>Brand colors</h3>
        <p className="type-small" style={{ color: "var(--color-text-muted)", margin: "4px 0 0" }}>
          {campusOnly
            ? "Choose your team or club colors. They apply across navigation, buttons, and accents."
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        {!campusOnly && (
          <div
            className="ds-card"
            style={{ padding: 12, background: "var(--color-bg)" }}
          >
            <p className="type-label" style={{ margin: "0 0 8px" }}>Organization</p>
            <div style={{ display: "flex", gap: 8 }}>
              <span
                style={{
                  height: 32, flex: 1, borderRadius: 6,
                  border: "1px solid var(--color-border)", background: preview.orgPrimary,
                }}
              />
              <span
                style={{
                  height: 32, flex: 1, borderRadius: 6,
                  border: "1px solid var(--color-border)", background: preview.orgSecondary,
                }}
              />
            </div>
            <p className="type-small" style={{ fontFamily: "var(--font-mono)", color: "var(--color-text-muted)", margin: "8px 0 0" }}>
              {preview.orgPrimary}
            </p>
          </div>
        )}
        <div
          className="ds-card"
          style={{ padding: 12, background: "var(--color-bg)", gridColumn: campusOnly ? "1 / -1" : undefined }}
        >
          <p className="type-label" style={{ margin: "0 0 8px" }}>
            {campusOnly ? "Team / club colors" : "Campus"}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <span
              style={{
                height: 32, flex: 1, borderRadius: 6,
                border: "1px solid var(--color-border)", background: preview.campusPrimary,
              }}
            />
            <span
              style={{
                height: 32, flex: 1, borderRadius: 6,
                border: "1px solid var(--color-border)", background: preview.campusSecondary,
              }}
            />
          </div>
          <p className="type-small" style={{ fontFamily: "var(--font-mono)", color: "var(--color-text-muted)", margin: "8px 0 0" }}>
            {preview.campusPrimary}
          </p>
        </div>
      </div>

      {(campusOnly || (value.greekAffiliationId === "custom" && isGreek) || colorsLocked) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
          <label className="type-body" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {campusOnly ? "Primary color" : "Custom org primary"}
            <input
              type="color"
              style={{
                height: 44, width: "100%", borderRadius: 6,
                border: "1px solid var(--color-border)", cursor: "pointer",
              }}
              value={value.primaryColor}
              disabled={disabled}
              onChange={(e) => {
                onManualColorChange?.();
                emit({
                  primaryColor: e.target.value,
                  ...(campusOnly ? { universityId: "custom-campus" } : {}),
                });
              }}
            />
          </label>
          <label className="type-body" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {campusOnly ? "Secondary color" : "Custom org secondary"}
            <input
              type="color"
              style={{
                height: 44, width: "100%", borderRadius: 6,
                border: "1px solid var(--color-border)", cursor: "pointer",
              }}
              value={value.secondaryColor}
              disabled={disabled}
              onChange={(e) => {
                onManualColorChange?.();
                emit({
                  secondaryColor: e.target.value,
                  ...(campusOnly ? { universityId: "custom-campus" } : {}),
                });
              }}
            />
          </label>
        </div>
      )}

      {campusOnly && (
        <p className="type-small" style={{ color: "var(--color-text-muted)", margin: 0 }}>
          Select a university to start from preset colors, or set primary and secondary directly.
        </p>
      )}
    </div>
  );
}
