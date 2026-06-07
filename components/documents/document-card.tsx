"use client";

import { useState } from "react";
import { Download, Eye, File, FileText, Image as ImageIcon, Loader2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge, Card } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import type { Document } from "@/types";

const MIME_ICON: Record<string, React.ReactNode> = {
  "application/pdf": <FileText size={18} className="text-red-500" />,
  "image/": <ImageIcon size={18} className="text-blue-500" aria-hidden />,
  "application/vnd": <FileText size={18} className="text-green-600" />,
  default: <File size={18} className="text-muted-foreground" />,
};

function fileIcon(mimeType: string | null) {
  if (!mimeType) return MIME_ICON.default;
  for (const [k, v] of Object.entries(MIME_ICON)) {
    if (mimeType.startsWith(k)) return v;
  }
  return MIME_ICON.default;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface DocumentCardProps {
  doc: Document & { version?: number };
  orgId: string;
  onDelete?: (id: string, storagePath: string) => void;
  onViewVersions?: (doc: Document) => void;
}

export function DocumentCard({ doc, orgId, onDelete, onViewVersions }: DocumentCardProps) {
  const [opening, setOpening] = useState(false);
  const showDelete = Boolean(onDelete);
  const useSignedUrl = Boolean(doc.storage_path);

  async function resolveUrl(): Promise<string | null> {
    if (!useSignedUrl) return doc.url || null;
    const params = new URLSearchParams({
      document_id: doc.id,
      org_id: orgId,
    });
    const res = await fetch(`/api/documents/signed-url?${params}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error ?? "Could not open document");
      return null;
    }
    return data.url as string;
  }

  async function openDocument() {
    setOpening(true);
    const url = await resolveUrl();
    setOpening(false);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  async function downloadDocument() {
    setOpening(true);
    const url = await resolveUrl();
    setOpening(false);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.title;
    a.rel = "noopener";
    a.click();
  }

  return (
    <Card padding="sm" className="group hover:border-greek-300 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-surface-1 border border-border flex items-center justify-center flex-shrink-0">
          {fileIcon(doc.mime_type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate">{doc.title}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <Badge label={doc.category} color="gray" />
            {doc.is_private && <Badge label="Private" color="red" />}
            {(doc as Document & { version?: number }).version && (doc as Document & { version?: number }).version! > 1 && (
              <Badge label={`v${(doc as Document & { version?: number }).version}`} color="blue" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {formatBytes(doc.file_size_bytes)}{doc.file_size_bytes ? " · " : ""}{formatDate(doc.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {onViewVersions && (
            <button
              type="button"
              onClick={() => onViewVersions(doc)}
              className="p-1.5 rounded-md hover:bg-surface-2 text-muted-foreground hover:text-foreground text-xs"
            >
              History
            </button>
          )}
          <button
            type="button"
            onClick={openDocument}
            disabled={opening}
            className="p-1.5 rounded-md hover:bg-surface-2 text-muted-foreground hover:text-foreground"
            aria-label="View document"
          >
            {opening ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
          </button>
          <button
            type="button"
            onClick={downloadDocument}
            disabled={opening}
            className="p-1.5 rounded-md hover:bg-surface-2 text-muted-foreground hover:text-foreground"
            aria-label="Download document"
          >
            <Download size={14} />
          </button>
          {showDelete && (
            <button
              type="button"
              onClick={() => onDelete!(doc.id, doc.storage_path)}
              className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-500"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

export { formatBytes };
