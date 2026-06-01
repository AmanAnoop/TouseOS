"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Download, Folder, Upload,
} from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import {
  Button, Card, EmptyState, Modal,
  Input, PageHeader, SearchInput, Select, Tabs,
} from "@/components/ui";
import { formatDate, downloadCsv } from "@/lib/utils";
import type { Document } from "@/types";
import { DocumentCard, formatBytes } from "@/components/documents/document-card";
import { DocumentVersionHistory } from "@/components/documents/document-version-history";

const CATEGORIES = [
  "General", "Bylaws & governance", "Risk & compliance",
  "Finance", "Recruitment", "New member education",
  "Housing", "Events", "Waivers & forms", "Alumni",
];

export default function DocumentsPage() {
  const supabase = createClient();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [uploadForm, setUploadForm] = useState({
    title: "", category: "General", isPrivate: false,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [versionDoc, setVersionDoc] = useState<Document | null>(null);

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("documents")
      .select("*")
      .eq("org_id", oid)
      .order("category")
      .order("created_at", { ascending: false });
    setDocs((data ?? []) as Document[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: m } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).limit(1).single();
      if (m) { setOrgId(m.org_id); load(m.org_id); }
    }
    init();
  }, [supabase, load]);

  const categories = [...new Set(docs.map((d) => d.category))];

  const filtered = docs.filter((d) => {
    const q = query.toLowerCase();
    const matchesQuery = !q || d.title.toLowerCase().includes(q) || d.category.toLowerCase().includes(q);
    const matchesTab = tab === "all" || d.category === tab;
    return matchesQuery && matchesTab;
  });

  async function uploadDocument() {
    if (!orgId || !userId || !selectedFile || !uploadForm.title) return;
    setUploading(true);

    const path = `${orgId}/${Date.now()}-${selectedFile.name}`;
    const { data: stored, error: uploadError } = await supabase.storage
      .from("documents")
      .upload(path, selectedFile, { upsert: false });

    if (uploadError) {
      toast.error(uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(stored.path);

    const { error: dbError } = await supabase.from("documents").insert({
      org_id: orgId,
      uploaded_by: userId,
      title: uploadForm.title,
      category: uploadForm.category,
      storage_path: stored.path,
      url: urlData.publicUrl,
      file_size_bytes: selectedFile.size,
      mime_type: selectedFile.type,
      is_private: uploadForm.isPrivate,
    });

    setUploading(false);
    if (dbError) { toast.error(dbError.message); return; }
    toast.success("Document uploaded");
    setUploadOpen(false);
    setSelectedFile(null);
    setUploadForm({ title: "", category: "General", isPrivate: false });
    load(orgId);
  }

  async function deleteDocument(id: string, storagePath: string) {
    if (!confirm("Delete this document?")) return;
    await supabase.storage.from("documents").remove([storagePath]);
    await supabase.from("documents").delete().eq("id", id);
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
    <div className="space-y-5">
      <PageHeader
        title="Documents"
        description={`${docs.length} document${docs.length !== 1 ? "s" : ""} stored`}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={exportList}>Export list</Button>
            <Button size="sm" icon={<Upload size={14} />} onClick={() => setUploadOpen(true)}>Upload</Button>
          </div>
        }
      />

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
          action={<Button size="sm" icon={<Upload size={14} />} onClick={() => setUploadOpen(true)}>Upload document</Button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onDelete={deleteDocument}
              onViewVersions={setVersionDoc}
            />
          ))}
        </div>
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

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="rounded" checked={uploadForm.isPrivate} onChange={(e) => setUploadForm({ ...uploadForm, isPrivate: e.target.checked })} />
            <div>
              <span className="text-sm font-medium">Private (officers only)</span>
              <p className="text-xs text-muted-foreground">Only officers and admins can view this document</p>
            </div>
          </label>
        </div>
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
