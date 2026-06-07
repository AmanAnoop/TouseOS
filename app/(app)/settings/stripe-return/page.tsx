import { Suspense } from "react";
import { StripeReturnClient } from "./stripe-return-client";

export default function StripeReturnPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-muted-foreground">Loading…</p>}>
      <StripeReturnClient />
    </Suspense>
  );
}
