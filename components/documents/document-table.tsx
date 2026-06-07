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

function DocumentRow({
  doc,
  folders,
  onMoveFolder,
  onDownload,
  onDelete,
}: {
  doc: Document;
  folders?: Array<{ id: string; name: string }>;
  onMoveFolder?: (docId: string, folderId: string | null) => void;
  onDownload: (doc: Document) => void;
  onDelete?: (id: string, storagePath: string) => void;
}) {
  return (
    <tr key={doc.id}>
      <td>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          {fileIcon(doc.mime_type, doc.title)}
          <span style={{ fontWeight: 500 }}>{doc.title}</span>
        </span>
      </td>
      <td className="type-small" style={{ color: "var(--color-text-secondary)" }}>
        {doc.uploaded_by_name ?? "—"}
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
            value={doc.folder_id ?? ""}
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
  );
}

export function DocumentTable({ docs, folders, onMoveFolder, onDownload, onDelete }: DocumentTableProps) {
  if (docs.length === 0) return null;

  return (
    <>
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
              <DocumentRow
                key={doc.id}
                doc={doc}
                folders={folders}
                onMoveFolder={onMoveFolder}
                onDownload={onDownload}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="ds-table-mobile space-y-2">
        {docs.map((doc) => (
          <div
            key={doc.id}
            className="rounded-xl border border-border bg-card p-3 space-y-2"
          >
            <div className="flex items-start gap-2">
              {fileIcon(doc.mime_type, doc.title)}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{doc.title}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.uploaded_by_name ?? "Unknown"} · {formatDate(doc.created_at)}
                  {doc.file_size_bytes ? ` · ${formatBytes(doc.file_size_bytes)}` : ""}
                </p>
              </div>
            </div>
            {onMoveFolder && folders && folders.length > 0 && (
              <select
                className="w-full text-xs border border-border rounded px-2 py-1.5 bg-background"
                value={doc.folder_id ?? ""}
                onChange={(e) => onMoveFolder(doc.id, e.target.value || null)}
              >
                <option value="">No folder</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            )}
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => onDownload(doc)}>Download</Button>
              {onDelete && doc.storage_path && (
                <Button size="sm" variant="danger" onClick={() => onDelete(doc.id, doc.storage_path!)}>Delete</Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
