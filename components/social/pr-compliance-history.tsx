"use client";

import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { Badge, Card, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { PrComplianceChecklist } from "@/components/social/pr-compliance-checklist";

interface Review {
  id: string;
  all_cleared: boolean;
  reviewer_name: string | null;
  photo_ids: string[];
  created_at: string;
}

export function PrComplianceHistory({ orgId }: { orgId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetch(`/api/pr-compliance?org_id=${orgId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setReviews(data);
        setLoading(false);
      });
  }

  useEffect(() => {
    load();
  }, [orgId]);

  return (
    <div className="space-y-4">
      <PrComplianceChecklist orgId={orgId} onApproved={load} />

      <div>
        <p className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Shield size={14} />
          Recent reviews
        </p>
        {loading ? (
          <Card className="h-20 animate-pulse bg-surface-2 border-0">&nbsp;</Card>
        ) : reviews.length === 0 ? (
          <EmptyState title="No saved reviews yet" description="Complete a checklist above before posting to Instagram." />
        ) : (
          <div className="space-y-2">
            {reviews.map((r) => (
              <Card key={r.id} padding="sm">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-sm font-medium">{r.reviewer_name ?? "Officer"}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(r.created_at)}</p>
                  </div>
                  <Badge label={r.all_cleared ? "Approved" : "Reviewed"} color={r.all_cleared ? "green" : "yellow"} />
                </div>
                {r.photo_ids?.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">{r.photo_ids.length} photo(s) in pack</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
