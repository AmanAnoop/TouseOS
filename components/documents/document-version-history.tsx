"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Download, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { Button, Modal } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { formatBytes } from "@/components/documents/document-card";
import type { Document } from "@/types";

interface DocumentVersion {
  id: string;
  version: number;
  url: string;
  storage_path: string;
  created_at: string;
}

interface DocumentVersionHistoryProps {
  doc: Document;
  orgId: string;
  userId: string;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function DocumentVersionHistory({
  doc, orgId, userId, open, onClose, onUpdated,
}: DocumentVersionHistoryProps) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [uploading, setUploading] = useState(false);
  const currentVersion = (doc as Document & { version?: number }).version ?? 1;

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("document_versions")
      .select("id, version, url, storage_path, created_at")
      .eq("document_id", doc.id)
      .order("version", { ascending: false });
    setVersions((data ?? []) as DocumentVersion[]);
  }, [supabase, doc.id]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function uploadNewVersion(file: File) {
    setUploading(true);
    const nextVersion = currentVersion + 1;
    const path = `${orgId}/${Date.now()}-v${nextVersion}-${file.name}`;

    const { data: stored, error: uploadError } = await supabase.storage
      .from("documents")
      .upload(path, file, { upsert: false });

    if (uploadError) {
      toast.error(uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(stored.path);

    await supabase.from("document_versions").insert({
      document_id: doc.id,
      version: currentVersion,
      storage_path: doc.storage_path,
      url: doc.url,
      uploaded_by: userId,
    });

    const { error: updateError } = await supabase.from("documents").update({
      storage_path: stored.path,
      url: urlData.publicUrl,
      version: nextVersion,
      file_size_bytes: file.size,
      mime_type: file.type,
      uploaded_by: userId,
    }).eq("id", doc.id);

    setUploading(false);
    if (updateError) { toast.error(updateError.message); return; }
    toast.success(`Uploaded version ${nextVersion}`);
    onUpdated();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Version history — ${doc.title}`}
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}
    >
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-greek-50 dark:bg-greek-950/20 border border-greek-200 text-sm">
          <span className="font-medium">Current:</span> v{currentVersion} · {formatDate(doc.created_at)}
        </div>

        {versions.length > 0 && (
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {versions.map((v) => (
              <li key={v.id} className="flex items-center justify-between p-2 rounded-lg border border-border text-sm">
                <span>v{v.version} · {formatDate(v.created_at)}</span>
                <a href={v.url} download className="text-greek-600 flex items-center gap-1">
                  <Download size={14} /> Download
                </a>
              </li>
            ))}
          </ul>
        )}

        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:border-greek-300"
        >
          <Upload size={20} className="mx-auto text-muted-foreground mb-1" />
          <p className="text-sm font-medium">Upload new version</p>
          <p className="text-xs text-muted-foreground">Current file ({formatBytes(doc.file_size_bytes)}) will be archived</p>
          <input ref={fileRef} type="file" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadNewVersion(file);
          }} />
        </div>
        {uploading && <p className="text-xs text-muted-foreground text-center">Uploading...</p>}
      </div>
    </Modal>
  );
}
