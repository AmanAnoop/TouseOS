"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { Badge, Card, EmptyState, Select } from "@/components/ui";
import { formatDate } from "@/lib/utils";

interface FormField {
  id: string;
  label: string;
  type: string;
  options?: string[];
}

interface FormTemplate {
  id: string;
  title: string;
  fields: FormField[];
}

interface FormResponseRow {
  member_id: string;
  responses: Record<string, unknown>;
  signature: string | null;
  submitted_at: string | null;
  member_profiles: { full_name?: string; email?: string } | null;
}

interface FieldAggregation {
  field: FormField;
  total: number;
  answered: number;
  counts: Record<string, number>;
  textSamples: string[];
}

function aggregateField(field: FormField, rows: FormResponseRow[]): FieldAggregation {
  const counts: Record<string, number> = {};
  const textSamples: string[] = [];
  let answered = 0;

  for (const row of rows) {
    const raw = row.responses[field.id] ?? row.responses[field.label];
    if (raw === undefined || raw === null || raw === "") continue;
    answered += 1;

    if (field.type === "checkbox") {
      const key = raw === true || raw === "true" || raw === "yes" ? "Yes" : "No";
      counts[key] = (counts[key] ?? 0) + 1;
    } else if (field.type === "select" && field.options?.length) {
      const key = String(raw);
      counts[key] = (counts[key] ?? 0) + 1;
    } else {
      const text = String(raw);
      if (textSamples.length < 5) textSamples.push(text);
    }
  }

  return { field, total: rows.length, answered, counts, textSamples };
}

export function FormResponsesPanel({
  orgId,
  forms,
}: {
  orgId: string;
  forms: FormTemplate[];
}) {
  const [selectedFormId, setSelectedFormId] = useState("");
  const [responses, setResponses] = useState<FormResponseRow[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedForm = forms.find((f) => f.id === selectedFormId);

  const loadResponses = useCallback(async (formId: string) => {
    setLoading(true);
    const res = await fetch(
      `/api/forms/responses?org_id=${encodeURIComponent(orgId)}&form_id=${encodeURIComponent(formId)}`,
    );
    if (res.ok) {
      const json = await res.json();
      setResponses((json.responses ?? []) as FormResponseRow[]);
    } else {
      setResponses([]);
    }
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    if (!selectedFormId) {
      setResponses([]);
      return;
    }
    loadResponses(selectedFormId);
  }, [selectedFormId, loadResponses]);

  const aggregations = useMemo(() => {
    if (!selectedForm) return [];
    return selectedForm.fields.map((field) => aggregateField(field, responses));
  }, [selectedForm, responses]);

  return (
    <div className="space-y-4">
      <Select
        label="Form"
        value={selectedFormId}
        onChange={(e) => setSelectedFormId(e.target.value)}
        placeholder="Select a form to view responses"
        options={[
          { value: "", label: "Select form…" },
          ...forms.map((f) => ({ value: f.id, label: f.title })),
        ]}
      />

      {!selectedFormId ? (
        <EmptyState
          icon={<BarChart3 size={24} />}
          title="Response aggregation"
          description="Pick a form to see per-question breakdowns and individual submissions."
        />
      ) : loading ? (
        <Card className="h-32 animate-pulse bg-surface-2 border-0">&nbsp;</Card>
      ) : responses.length === 0 ? (
        <EmptyState title="No responses yet" description="Share the form link with members to collect answers." />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {responses.length} response{responses.length !== 1 ? "s" : ""} for <strong>{selectedForm?.title}</strong>
          </p>

          <div className="space-y-3">
            {aggregations.map((agg) => (
              <Card key={agg.field.id} padding="sm">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-medium text-sm">{agg.field.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {agg.answered}/{agg.total} answered · {agg.field.type.replace(/_/g, " ")}
                    </p>
                  </div>
                  <Badge
                    label={`${Math.round((agg.answered / Math.max(agg.total, 1)) * 100)}%`}
                    color={agg.answered === agg.total ? "green" : "yellow"}
                  />
                </div>

                {Object.keys(agg.counts).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {Object.entries(agg.counts)
                      .sort((a, b) => b[1] - a[1])
                      .map(([label, count]) => (
                        <span key={label} className="text-xs bg-surface-2 rounded-full px-2.5 py-1">
                          {label}: <strong>{count}</strong>
                        </span>
                      ))}
                  </div>
                )}

                {agg.textSamples.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {agg.textSamples.map((sample, i) => (
                      <li key={i} className="line-clamp-2 border-l-2 border-border pl-2">{sample}</li>
                    ))}
                    {agg.answered > agg.textSamples.length && (
                      <li className="text-muted-foreground/80">+{agg.answered - agg.textSamples.length} more</li>
                    )}
                  </ul>
                )}
              </Card>
            ))}
          </div>

          <Card padding="sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Individual submissions</p>
            <div className="ds-table-wrap">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Submitted</th>
                    {selectedForm?.fields.slice(0, 4).map((f) => (
                      <th key={f.id}>{f.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {responses.map((row) => (
                    <tr key={`${row.member_id}-${row.submitted_at}`}>
                      <td>{row.member_profiles?.full_name ?? "—"}</td>
                      <td className="type-small">{row.submitted_at ? formatDate(row.submitted_at) : "—"}</td>
                      {selectedForm?.fields.slice(0, 4).map((f) => {
                        const v = row.responses[f.id] ?? row.responses[f.label];
                        const display = typeof v === "boolean" ? (v ? "Yes" : "No") : (v == null ? "—" : String(v));
                        return (
                          <td key={f.id} className="type-small max-w-[160px] truncate" title={display}>
                            {display}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
