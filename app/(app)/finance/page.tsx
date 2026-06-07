"use client";

import { Suspense } from "react";
import { UnifiedFinancePage } from "@/components/finance/unified-finance-page";

export default function FinancePage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Loading…</p>}>
      <UnifiedFinancePage />
    </Suspense>
  );
}
