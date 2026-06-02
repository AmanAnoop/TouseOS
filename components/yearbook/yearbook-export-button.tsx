"use client";

import { Download, FileText, Server } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui";
import { downloadYearbookHtml, type YearbookExportData } from "@/lib/yearbook-export";

interface YearbookExportButtonProps {
  data: YearbookExportData;
  orgId: string;
}

export function YearbookExportButton({ data, orgId }: YearbookExportButtonProps) {
  const empty = data.events.length === 0 && data.photos.length === 0 && !(data.sections ?? []).length;

  function handleExport() {
    if (empty) {
      toast.error("Add events and approved photos before exporting");
      return;
    }
    downloadYearbookHtml(data);
    toast.success("Yearbook exported — open in browser and print to PDF");
  }

  function handleServerExport() {
    if (empty) {
      toast.error("Add content before exporting");
      return;
    }
    window.open(`/api/yearbook/export?org_id=${encodeURIComponent(orgId)}`, "_blank");
    toast.success("Downloading yearbook file from server");
  }

  function handleServerPrintExport() {
    if (empty) {
      toast.error("Add content before exporting");
      return;
    }
    window.open(
      `/api/yearbook/export?org_id=${encodeURIComponent(orgId)}&autoprint=1`,
      "_blank",
    );
    toast.success("Opening print-ready yearbook");
  }

  function handlePdfExport() {
    if (empty) {
      toast.error("Add content before exporting");
      return;
    }
    window.open(
      `/api/yearbook/export/pdf?org_id=${encodeURIComponent(orgId)}`,
      "_blank",
    );
    toast.success("Downloading PDF yearbook");
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={handleExport} disabled={empty} className="officer-touch">
        Export HTML
      </Button>
      <Button variant="secondary" size="sm" icon={<Server size={14} />} onClick={handleServerExport} disabled={empty} className="officer-touch">
        Server export
      </Button>
      <Button variant="secondary" size="sm" onClick={handleServerPrintExport} disabled={empty} className="officer-touch">
        Export & print
      </Button>
      <Button variant="secondary" size="sm" icon={<FileText size={14} />} onClick={handlePdfExport} disabled={empty} className="officer-touch">
        Download PDF
      </Button>
    </div>
  );
}
