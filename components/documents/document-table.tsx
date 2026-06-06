"use client";

import { FileText, Image, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { formatBytes } from "@/components/documents/document-card";
import type { Document } from "@/types";

interface DocumentTableProps {
  docs: Document[];
  folders?: Array<{ id: string; name: string }>;
  onMoveFolder?: (docId: string, folderId: string | null) => void;
  onDownload: (doc: Document) => void;
  onDelete?: (id: string, storagePath: string) => void;
}

function fileIcon(mime: string | null | undefined, title: string) {
  const t = (mime ?? title).toLowerCase();
  if (t.includes("image") || /\.(jpg|jpeg|png|gif|webp)$/i.test(title)) {
    return <Image size={16} aria-label="Image file" />;
  }
  return <FileText size={16} aria-label="Document file" />;
}

export function DocumentTable({ docs, folders, onMoveFolder, onDownload, onDelete }: DocumentTableProps) {
  if (docs.length === 0) return null;

  return (
    <div className="ds-table-wrap ds-table-desktop">
      <table className="ds-table">
        <thead>
          <tr>
            <th>Filename</th>
            <th>Uploaded by</th>
            <th>Date</th>
            <th className="ds-td-num">Size</th>
            {onMoveFolder && folders && folders.length > 0 && <th>Folder</th>}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {docs.map((doc) => (
            <tr key={doc.id}>
              <td>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  {fileIcon(doc.mime_type, doc.title)}
                  <span style={{ fontWeight: 500 }}>{doc.title}</span>
                </span>
              </td>
              <td className="type-small" style={{ color: "var(--color-text-secondary)" }}>
                Member
              </td>
              <td className="type-small" style={{ color: "var(--color-text-secondary)" }}>
                {formatDate(doc.created_at)}
              </td>
              <td className="ds-td-num" style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
                {formatBytes(doc.file_size_bytes)}
              </td>
              {onMoveFolder && folders && folders.length > 0 && (
                <td>
                  <select
                    className="text-xs border border-border rounded px-2 py-1 bg-background"
                    value={(doc as Document & { folder_id?: string }).folder_id ?? ""}
                    onChange={(e) => onMoveFolder(doc.id, e.target.value || null)}
                  >
                    <option value="">No folder</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </td>
              )}
              <td>
                <div style={{ display: "flex", gap: 4 }}>
                  <Button size="sm" variant="ghost" icon={<Download size={14} />} onClick={() => onDownload(doc)} aria-label="Download">
                    Download
                  </Button>
                  {onDelete && doc.storage_path && (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Trash2 size={14} />}
                      onClick={() => onDelete(doc.id, doc.storage_path!)}
                      aria-label="Delete"
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
