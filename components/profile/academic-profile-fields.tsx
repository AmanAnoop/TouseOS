"use client";

import { Select } from "@/components/ui";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { HometownField } from "@/components/forms/hometown-field";
import { CLASS_YEAR_OPTIONS, MAJOR_COMBOBOX_OPTIONS } from "@/lib/academic-fields";

export interface AcademicProfileValues {
  classYear: string;
  major: string;
  hometown: string;
}

interface AcademicProfileFieldsProps {
  values: AcademicProfileValues;
  onChange: (updates: Partial<AcademicProfileValues>) => void;
  layout?: "grid" | "stack";
  /** School-specific majors when available; falls back to COMMON_MAJORS list. */
  majorOptions?: Array<{ value: string; label: string }>;
}

export function AcademicProfileFields({
  values,
  onChange,
  layout = "grid",
  majorOptions,
}: AcademicProfileFieldsProps) {
  const wrapperClass = layout === "grid" ? "grid grid-cols-2 gap-3" : "space-y-3";
  const majors = majorOptions?.length ? majorOptions : MAJOR_COMBOBOX_OPTIONS;

  return (
    <div className={wrapperClass}>
      <Select
        label="Class year"
        value={values.classYear}
        onChange={(e) => onChange({ classYear: e.target.value })}
        options={[{ value: "", label: "Select year…" }, ...CLASS_YEAR_OPTIONS]}
      />
      <SearchableCombobox
        label="Major"
        value={values.major}
        options={majors}
        onChange={(major) => onChange({ major })}
        placeholder="Search majors…"
        strict
      />
      <HometownField
        value={values.hometown}
        onChange={(hometown) => onChange({ hometown })}
        className={layout === "grid" ? "col-span-2" : undefined}
      />
    </div>
  );
}
