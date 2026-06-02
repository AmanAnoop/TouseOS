"use client";

import { YearbookSectionsEditor } from "@/components/yearbook/yearbook-sections-editor";

export function YearbookPageExtras({ orgId }: { orgId: string }) {
  return <YearbookSectionsEditor orgId={orgId} />;
}
