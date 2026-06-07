"use client";

import { useEffect, useState } from "react";
import { buildYearbookHtml, type YearbookExportData } from "@/lib/yearbook-export";
import { Button } from "@/components/ui";

export function YearbookPrintClient({ data }: { data: YearbookExportData }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (data.events.length === 0 && data.photos.length === 0 && !(data.sections ?? []).length) {
      return;
    }
    const html = buildYearbookHtml(data);
    document.open();
    document.write(html);
    document.close();
    setReady(true);
    const t = setTimeout(() => window.print(), 800);
    return () => clearTimeout(t);
  }, [data]);

  if (data.events.length === 0 && data.photos.length === 0 && !(data.sections ?? []).length) {
    return (
      <p className="p-8 text-center text-muted-foreground">
        Add events, photos, or custom sections before printing.
      </p>
    );
  }

  return (
    <div className="p-8 text-center space-y-4">
      <p className="text-sm text-muted-foreground">
        {ready ? "Use the print dialog to save as PDF." : "Preparing yearbook for print…"}
      </p>
      <Button size="sm" onClick={() => window.print()}>
        Print / Save as PDF
      </Button>
    </div>
  );
}
