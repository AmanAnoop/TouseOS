"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plane } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { tripTypesForProduct, travelProductFromOrgType } from "@/lib/travel-config";
import { useOrg } from "@/hooks/use-org";

interface TemplateRow {
  id: string;
  name: string;
  type: string;
  checklist_items?: string[];
  created_at?: string;
}

export default function TravelTemplatesPage() {
  const { orgId, orgType } = useOrg();
  const product = travelProductFromOrgType(orgType);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    if (product === "greek") {
      const res = await fetch(`/api/greek/travel/templates?org_id=${encodeURIComponent(oid)}`);
      if (res.ok) setTemplates((await res.json()) as TemplateRow[]);
    }
    setLoading(false);
  }, [product]);

  useEffect(() => {
    if (orgId) load(orgId);
  }, [orgId, load]);

  const typeLabels = Object.fromEntries(tripTypesForProduct(product).map((t) => [t.value, t.label]));

  return (
    <div className="ds-page-stack">
      <Link href="/travel" className="type-small" style={{ color: "var(--color-org-primary)", display: "inline-flex", alignItems: "center", gap: 4 }}>
        <ArrowLeft size={14} /> Back to trips
      </Link>

      <PageHeader
        title="Travel templates"
        description="Reuse checklist and itinerary structure from completed trips"
      />

      {loading ? (
        <div className="ds-page-skeleton"><div className="ds-page-skeleton-header" /></div>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={<Plane size={20} />}
          title="No templates yet"
          description={product === "greek"
            ? "Complete a trip and save it as a template from the trip detail page."
            : "Templates for sports trips are saved from completed trip workspaces."}
        />
      ) : (
        <div className="ds-page-stack" style={{ gap: 12 }}>
          {templates.map((t) => (
            <Card key={t.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div>
                  <p className="type-body" style={{ fontWeight: 500, margin: 0 }}>{t.name}</p>
                  <Badge label={typeLabels[t.type] ?? t.type} color="blue" />
                  {Array.isArray(t.checklist_items) && t.checklist_items.length > 0 && (
                    <p className="type-small" style={{ color: "var(--color-text-muted)", margin: "8px 0 0" }}>
                      {t.checklist_items.length} checklist items
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
