"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Download, Folder, FolderPlus, Upload,
} from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import {
  Button, Card, EmptyState, Modal,
  Input, PageHeader, SearchInput, Select, Tabs,
} from "@/components/ui";
import { formatDate, downloadCsv } from "@/lib/utils";
import type { Document } from "@/types";
import { formatBytes } from "@/components/documents/document-card";
import { DocumentTable } from "@/components/documents/document-table";
import { DocumentVersionHistory } from "@/components/documents/document-version-history";
import { usePermissions } from "@/hooks/use-permissions";
import { useOrg } from "@/hooks/use-org";

const CATEGORIES = [
  "General", "Bylaws & governance", "Risk & compliance",
  "Finance", "Recruitment", "New member education",
  "Housing", "Events", "Waivers & forms", "Alumni",
];

export default function DocumentsPage() {
  const supabase = createClient();
  const { orgId, userId } = useOrg();
  const { can, loading: permLoading } = usePermissions();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<Array<{ id: string; name: string }>>([]);
  const [folderOpen, setFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [query, setQuery] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [uploadForm, setUploadForm] = useState({
    title: "", category: "General", isPrivate: false, folderId: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [versionDoc, setVersionDoc] = useState<Document | null>(null);

  const canManageDocs = !permLoading && can("manage_documents");

  const loadFolders = useCallback(async (oid: string) => {
    const res = await fetch(`/api/document-folders?org_id=${encodeURIComponent(oid)}`);
    if (res.ok) setFolders(await res.json());
  }, []);

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const res = await fetch(`/api/documents?org_id=${encodeURIComponent(oid)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to load documents");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setDocs((data ?? []) as Document[]);
    await loadFolders(oid);
    setLoading(false);
  }, [loadFolders]);

  useEffect(() => {
    if (orgId) load(orgId);
  }, [orgId, load]);

  const categories = [...new Set(docs.map((d) => d.category))];

  const filtered = docs.filter((d) => {
    const q = query.toLowerCase();
    const matchesQuery = !q || d.title.toLowerCase().includes(q) || d.category.toLowerCase().includes(q);
    const matchesTab = tab === "all" || d.category === tab;
    const matchesFolder = !folderId || d.folder_id === folderId;
    return matchesQuery && matchesTab && matchesFolder;
  });

  async function createFolder() {
    if (!orgId || !newFolderName.trim()) return;
    const res = await fetch("/api/document-folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, name: newFolderName.trim() }),
    });
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Failed");
      return;
    }
    toast.success("Folder created");
    setFolderOpen(false);
    setNewFolderName("");
    loadFolders(orgId);
  }

  async function moveToFolder(docId: string, targetFolderId: string | null) {
    if (!orgId) return;
    const res = await fetch("/api/documents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: docId, orgId, folderId: targetFolderId }),
    });
    if (!res.ok) {
      toast.error("Could not move document");
      return;
    }
    toast.success("Document moved");
    load(orgId);
  }

  async function uploadDocument() {
    if (!orgId || !userId || !selectedFile || !uploadForm.title) return;
    setUploading(true);
    setUploadError(null);

    const path = `${orgId}/${Date.now()}-${selectedFile.name}`;
    let stored: { path: string } | null = null;
    try {
      const { data, error: storageErr } = await supabase.storage
        .from("documents")
        .upload(path, selectedFile, { upsert: false });
      if (storageErr) {
        setUploadError(storageErr.message);
        setUploading(false);
        return;
      }
      stored = data;
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
      return;
    }

    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        title: uploadForm.title,
        category: uploadForm.category,
        storagePath: stored!.path,
        url: null,
        fileSizeBytes: selectedFile.size,
        mimeType: selectedFile.type,
        isPrivate: uploadForm.isPrivate,
        folderId: uploadForm.folderId || folderId || null,
      }),
    });

    setUploading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setUploadError(data.error ?? "Failed to save document");
      setUploading(false);
      return;
    }
    toast.success("Document saved");
    setUploadError(null);
    setUploadOpen(false);
    setSelectedFile(null);
    setUploadForm({ title: "", category: "General", isPrivate: false, folderId: "" });
    load(orgId);
  }

  async function deleteDocument(id: string, storagePath: string) {
    if (!confirm("Delete this document?")) return;
    const params = new URLSearchParams({ id, storage_path: storagePath });
    const res = await fetch(`/api/documents?${params}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Delete failed");
      return;
    }
    setDocs((prev) => prev.filter((d) => d.id !== id));
    toast.success("Document deleted");
  }

  function exportList() {
    downloadCsv("documents.csv", filtered.map((d) => ({
      Title: d.title,
      Category: d.category,
      "File size": formatBytes(d.file_size_bytes),
      "Uploaded": formatDate(d.created_at),
      URL: d.url,
    })));
  }

  const tabItems = [
    { id: "all", label: "All", count: docs.length },
    ...categories.map((cat) => ({ id: cat, label: cat, count: docs.filter((d) => d.category === cat).length })),
  ];

  return (
    <div className="ds-page-stack">
      <PageHeader
        title="Documents"
        description={`${docs.length} document${docs.length !== 1 ? "s" : ""} stored`}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={exportList}>Export list</Button>
            {canManageDocs && (
              <>
                <Button variant="secondary" size="sm" icon={<FolderPlus size={14} />} onClick={() => setFolderOpen(true)}>New folder</Button>
                <Button size="sm" icon={<Upload size={14} />} onClick={() => setUploadOpen(true)}>Upload</Button>
              </>
            )}
          </div>
        }
      />

      {folders.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setFolderId(null)}
            className={`text-xs px-3 py-1.5 rounded-full border ${!folderId ? "bg-greek-100 border-greek-300 text-greek-800" : "border-border text-muted-foreground"}`}
          >
            All folders
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFolderId(f.id)}
              className={`text-xs px-3 py-1.5 rounded-full border flex items-center gap-1 ${folderId === f.id ? "bg-greek-100 border-greek-300 text-greek-800" : "border-border text-muted-foreground"}`}
            >
              <Folder size={12} /> {f.name}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-x-auto scrollbar-hide">
        <Tabs tabs={tabItems.slice(0, 8)} active={tab} onChange={setTab} />
      </div>

      <SearchInput value={query} onChange={setQuery} placeholder="Search documents..." />

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {[1,2,3,4].map((i) => <Card key={i} className="h-20 animate-pulse bg-surface-2 border-0">&nbsp;</Card>)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Folder size={24} />}
          title="No documents"
          description="Upload bylaws, risk forms, waivers, and other chapter documents."
          action={canManageDocs ? <Button size="sm" icon={<Upload size={14} />} onClick={() => setUploadOpen(true)}>Upload document</Button> : undefined}
        />
      ) : (
        <DocumentTable
          docs={filtered}
          folders={folders}
          onMoveFolder={canManageDocs ? moveToFolder : undefined}
          onDownload={async (doc) => {
            if (doc.url) window.open(doc.url, "_blank");
            else if (doc.storage_path) {
              const { data } = await supabase.storage.from("documents").createSignedUrl(doc.storage_path, 3600);
              if (data?.signedUrl) window.open(data.signedUrl, "_blank");
            }
          }}
          onDelete={canManageDocs ? deleteDocument : undefined}
        />
      )}

      {/* Upload modal */}
      <Modal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload document"
        footer={
          <>
            <Button variant="secondary" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button onClick={uploadDocument} loading={uploading} disabled={!selectedFile || !uploadForm.title}>
              Upload
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${selectedFile ? "border-greek-400 bg-greek-50 dark:bg-greek-950/20" : "border-border hover:border-greek-300"}`}
          >
            <Upload size={24} className="mx-auto text-muted-foreground mb-2" />
            {selectedFile ? (
              <div>
                <p className="font-medium text-sm text-foreground">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(selectedFile.size)}</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-foreground">Click to select a file</p>
                <p className="text-xs text-muted-foreground">PDF, Word, Excel, images up to 50MB</p>
              </div>
            )}
            <input ref={fileRef} type="file" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setSelectedFile(file);
                if (!uploadForm.title) setUploadForm((f) => ({ ...f, title: file.name.replace(/\.[^.]+$/, "") }));
              }
            }} />
          </div>

          <Input label="Document title" required value={uploadForm.title} onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })} placeholder="e.g. Risk Management Policy 2025" />

          <Select
            label="Category"
            value={uploadForm.category}
            onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
            options={CATEGORIES.map((c) => ({ value: c, label: c }))}
          />

          {folders.length > 0 && (
            <Select
              label="Folder"
              value={uploadForm.folderId || folderId || ""}
              onChange={(e) => setUploadForm({ ...uploadForm, folderId: e.target.value })}
              options={[
                { value: "", label: "No folder" },
                ...folders.map((f) => ({ value: f.id, label: f.name })),
              ]}
            />
          )}

          {uploadError && (
            <p className="type-small" style={{ color: "var(--color-error)" }} role="alert">{uploadError}</p>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="rounded" checked={uploadForm.isPrivate} onChange={(e) => setUploadForm({ ...uploadForm, isPrivate: e.target.checked })} />
            <div>
              <span className="text-sm font-medium">Private (officers only)</span>
              <p className="text-xs text-muted-foreground">Only officers and admins can view this document</p>
            </div>
          </label>
        </div>
      </Modal>

      <Modal
        open={folderOpen}
        onClose={() => setFolderOpen(false)}
        title="New folder"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFolderOpen(false)}>Cancel</Button>
            <Button onClick={createFolder} disabled={!newFolderName.trim()}>Create</Button>
          </>
        }
      >
        <Input label="Folder name" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Risk & compliance" />
      </Modal>

      {versionDoc && orgId && userId && (
        <DocumentVersionHistory
          doc={versionDoc}
          orgId={orgId}
          userId={userId}
          open={Boolean(versionDoc)}
          onClose={() => setVersionDoc(null)}
          onUpdated={() => { if (orgId) load(orgId); setVersionDoc(null); }}
        />
      )}
    </div>
  );
}
