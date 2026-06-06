"use client";

import { useState } from "react";
import { Input, Select } from "@/components/ui";
import { HometownField } from "@/components/forms/hometown-field";
import { CLASS_YEAR_OPTIONS, MAJOR_SELECT_OPTIONS } from "@/lib/academic-fields";

export interface AcademicProfileValues {
  classYear: string;
  major: string;
  hometown: string;
}

interface AcademicProfileFieldsProps {
  values: AcademicProfileValues;
  onChange: (updates: Partial<AcademicProfileValues>) => void;
  layout?: "grid" | "stack";
}

export function AcademicProfileFields({
  values,
  onChange,
  layout = "grid",
}: AcademicProfileFieldsProps) {
  const knownMajor = MAJOR_SELECT_OPTIONS.some(
    (o) => o.value && o.value !== "__other__" && o.value === values.major,
  );
  const [majorMode, setMajorMode] = useState(knownMajor || !values.major ? "select" : "other");
  const majorSelectValue = knownMajor ? values.major : majorMode === "other" ? "__other__" : "";

  const wrapperClass = layout === "grid" ? "grid grid-cols-2 gap-3" : "space-y-3";

  return (
    <div className={wrapperClass}>
      <Select
        label="Class year"
        value={values.classYear}
        onChange={(e) => onChange({ classYear: e.target.value })}
        options={[{ value: "", label: "Select year…" }, ...CLASS_YEAR_OPTIONS]}
      />
      <div className="space-y-2">
        <Select
          label="Major"
          value={majorSelectValue}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "__other__") {
              setMajorMode("other");
              onChange({ major: "" });
            } else {
              setMajorMode("select");
              onChange({ major: v });
            }
          }}
          options={MAJOR_SELECT_OPTIONS}
        />
        {majorMode === "other" && (
          <Input
            label="Major (other)"
            value={values.major}
            onChange={(e) => onChange({ major: e.target.value })}
            placeholder="Custom major"
          />
        )}
      </div>
      <HometownField
        value={values.hometown}
        onChange={(hometown) => onChange({ hometown })}
        className={layout === "grid" ? "col-span-2" : undefined}
      />
    </div>
  );
}
