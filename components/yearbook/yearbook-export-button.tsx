"use client";

import { Download } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui";
import { downloadYearbookHtml, type YearbookExportData } from "@/lib/yearbook-export";

interface YearbookExportButtonProps {
  data: YearbookExportData;
}

export function YearbookExportButton({ data }: YearbookExportButtonProps) {
  function handleExport() {
    if (data.events.length === 0 && data.photos.length === 0) {
      toast.error("Add events and approved photos before exporting");
      return;
    }
    downloadYearbookHtml(data);
    toast.success("Yearbook exported — open in browser and print to PDF");
  }

  return (
    <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={handleExport}>
      Export yearbook
    </Button>
  );
}
