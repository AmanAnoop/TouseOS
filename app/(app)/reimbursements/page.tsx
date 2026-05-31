"use client";

import { useState, useEffect, useCallback } from "react";
import { useRef } from "react";
import {
  CheckCircle, Clock, DollarSign, Download, Plus,
  Receipt, Upload, X, XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import {
  Avatar, Badge, Button, Card, CardHeader, EmptyState,
  Input, Modal, PageHeader, Select, StatCard, Tabs, Textarea,
} from "@/components/ui";
import { downloadCsv, formatCurrency, formatDate } from "@/lib/utils";
import type { Reimbursement } from "@/types";

const STATUS_COLOR: Record<string, string> = {
  submitted: "yellow", needs_info: "orange", approved: "blue",
  rejected: "red", paid: "green",
};

const CATEGORIES = [
  "Food & catering", "Venue / facility", "Transportation",
  "Security", "Decorations", "Printing & materials",
  "Equipment", "Hotel / lodging", "Entertainment",
  "Philanthropy", "Recruitment", "Technology", "Other",
];

export default function ReimbursementsPage() {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [reimbs, setReimbs] = useState<Reimbursement[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [tab, setTab] = useState("pending");
  const [submitOpen, setSubmitOpen] = useState(false);
  const [selected, setSelected] = useState<Reimbursement | null>(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    amount: "", category: "Food & catering", description: "",
    eventId: "", receiptUrl: "",
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [events, setEvents] = useState<Array<{ id: string; title: string }>>([]);

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("reimbursements")
      .select("*")
      .eq("org_id", oid)
      .order("created_at", { ascending: false });
    setReimbs((data ?? []) as Reimbursement[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const [mRes, pRes, eRes] = await Promise.all([
        supabase.from("org_members").select("org_id").eq("user_id", user.id).limit(1).single(),
        supabase.from("profiles").select("full_name").eq("id", user.id).single(),
        supabase.from("events").select("id, title").order("starts_at", { ascending: false }).limit(30),
      ]);
      if (mRes.data) { setOrgId(mRes.data.org_id); load(mRes.data.org_id); }
      if (pRes.data) setUserName(String(pRes.data.full_name));
      if (eRes.data) setEvents(eRes.data as Array<{ id: string; title: string }>);
    }
    init();
  }, [supabase, load]);

  async function submitReimbursement() {
    if (!orgId || !userId || !form.amount || !form.description) return;
    setUploading(true);

    let receiptUrl = form.receiptUrl;
    if (receiptFile) {
      const path = `${orgId}/receipts/${Date.now()}-${receiptFile.name}`;
      const { data: stored, error } = await supabase.storage.from("receipts").upload(path, receiptFile, { upsert: false });
      if (error) { toast.error(error.message); setUploading(false); return; }
      const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(stored.path);
      receiptUrl = urlData.publicUrl;
    }

    const { error } = await supabase.from("reimbursements").insert({
      org_id: orgId,
      submitted_by: userId,
      submitted_by_name: userName,
      event_id: form.eventId || null,
      amount: parseFloat(form.amount),
      category: form.category,
      description: form.description,
      receipt_url: receiptUrl || null,
      status: "submitted",
    });

    setUploading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Reimbursement submitted");
    setSubmitOpen(false);
    setForm({ amount: "", category: "Food & catering", description: "", eventId: "", receiptUrl: "" });
    setReceiptFile(null);
    load(orgId);
  }

  async function updateStatus(id: string, status: string, notes?: string) {
    const updates: Record<string, unknown> = { status };
    if (notes) updates.rejection_reason = notes;
    if (status === "approved" || status === "paid") {
      updates.reviewed_by = userId;
      updates.reviewed_at = new Date().toISOString();
    }
    if (status === "paid") updates.paid_at = new Date().toISOString();
    await supabase.from("reimbursements").update(updates).eq("id", id);
    setReimbs((prev) => prev.map((r) => r.id === id ? { ...r, ...updates } : r));
    toast.success(`Request ${status}`);
    setSelected(null);
  }

  const filtered = reimbs.filter((r) => {
    if (tab === "pending") return ["submitted", "needs_info"].includes(r.status);
    if (tab === "approved") return r.status === "approved";
    if (tab === "paid") return r.status === "paid";
    if (tab === "rejected") return r.status === "rejected";
    return true;
  });

  const pendingCount = reimbs.filter((r) => ["submitted","needs_info"].includes(r.status)).length;
  const totalPending = reimbs.filter((r) => r.status === "submitted").reduce((s, r) => s + Number(r.amount), 0);
  const totalPaid = reimbs.filter((r) => r.status === "paid").reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reimbursements"
        description={`${pendingCount} pending · ${formatCurrency(totalPending)} awaiting approval`}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={() => downloadCsv("reimbursements.csv", reimbs.map((r) => ({ Submitter: r.submitted_by_name ?? "", Amount: r.amount, Category: r.category, Description: r.description, Status: r.status, Date: formatDate(r.created_at) })))}>Export</Button>
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setSubmitOpen(true)}>Request reimbursement</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Pending" value={pendingCount} deltaType={pendingCount > 0 ? "down" : "neutral"} icon={<Clock size={18} />} />
        <StatCard title="Awaiting payment" value={formatCurrency(totalPending)} icon={<DollarSign size={18} />} />
        <StatCard title="Total paid" value={formatCurrency(totalPaid)} deltaType="up" icon={<CheckCircle size={18} />} />
        <StatCard title="Total requests" value={reimbs.length} icon={<Receipt size={18} />} />
      </div>

      <Tabs
        tabs={[
          { id: "pending", label: "Pending", count: pendingCount },
          { id: "approved", label: "Approved" },
          { id: "paid", label: "Paid" },
          { id: "rejected", label: "Rejected" },
          { id: "all", label: "All", count: reimbs.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {loading ? (
        <div className="space-y-2">{[1,2,3].map((i) => <Card key={i} className="h-16 animate-pulse bg-surface-2 border-0">&nbsp;</Card>)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Receipt size={24} />}
          title={tab === "pending" ? "No pending requests" : "No reimbursements found"}
          description="Submit a reimbursement request after spending chapter funds."
          action={tab === "pending" ? <Button size="sm" icon={<Plus size={14} />} onClick={() => setSubmitOpen(true)}>Submit request</Button> : undefined}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <Card
              key={r.id}
              onClick={() => setSelected(r)}
              className="cursor-pointer hover:border-greek-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Avatar name={r.submitted_by_name ?? "?"} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-foreground">{r.description}</p>
                    <Badge label={r.status} color={STATUS_COLOR[r.status] as "green"} />
                  </div>
                  <p className="text-xs text-muted-foreground">{r.submitted_by_name ?? "—"} · {r.category} · {formatDate(r.created_at)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-foreground">{formatCurrency(Number(r.amount))}</p>
                  {r.receipt_url && (
                    <a href={r.receipt_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-greek-600 hover:underline flex items-center gap-1 justify-end">
                      <Receipt size={10} />
                      Receipt
                    </a>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Submit modal */}
      <Modal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        title="Submit reimbursement request"
        description="Upload your receipt and describe what was purchased."
        footer={
          <>
            <Button variant="secondary" onClick={() => setSubmitOpen(false)}>Cancel</Button>
            <Button onClick={submitReimbursement} loading={uploading} disabled={!form.amount || !form.description}>Submit</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Amount ($)" type="number" required placeholder="45.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
          </div>
          <Textarea label="Description *" placeholder="What was purchased and why?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          {events.length > 0 && (
            <Select label="Assign to event (optional)" value={form.eventId} onChange={(e) => setForm({ ...form, eventId: e.target.value })} placeholder="No specific event" options={events.map((e) => ({ value: e.id, label: e.title }))} />
          )}

          {/* Receipt upload */}
          <div>
            <label className="text-sm font-medium block mb-1.5">Receipt</label>
            <div
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${receiptFile ? "border-greek-400 bg-greek-50 dark:bg-greek-950/20" : "border-border hover:border-greek-300"}`}
            >
              {receiptFile ? (
                <div className="flex items-center justify-center gap-2">
                  <Receipt size={16} className="text-greek-600" />
                  <p className="text-sm font-medium text-foreground">{receiptFile.name}</p>
                  <button onClick={(e) => { e.stopPropagation(); setReceiptFile(null); }} className="text-muted-foreground hover:text-red-500">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div>
                  <Upload size={18} className="mx-auto text-muted-foreground mb-1" />
                  <p className="text-sm text-muted-foreground">Upload receipt (photo or PDF)</p>
                </div>
              )}
              <input ref={fileRef} type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
        </div>
      </Modal>

      {/* Detail modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.description ?? ""}
        size="md"
        footer={
          <div className="flex gap-2 flex-wrap w-full">
            {selected?.status === "submitted" && (
              <>
                <Button onClick={() => updateStatus(selected.id, "approved")} icon={<CheckCircle size={14} />}>Approve</Button>
                <Button variant="secondary" onClick={() => updateStatus(selected.id, "needs_info")}>Need info</Button>
                <Button variant="danger" onClick={() => updateStatus(selected.id, "rejected")} icon={<XCircle size={14} />}>Reject</Button>
              </>
            )}
            {selected?.status === "approved" && (
              <Button onClick={() => updateStatus(selected.id, "paid")} icon={<DollarSign size={14} />}>Mark as paid</Button>
            )}
            <Button variant="secondary" onClick={() => setSelected(null)} className="ml-auto">Close</Button>
          </div>
        }
      >
        {selected && (
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(Number(selected.amount))}</p>
                <p className="text-sm text-muted-foreground">{selected.category}</p>
              </div>
              <Badge label={selected.status} color={STATUS_COLOR[selected.status] as "green"} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2 bg-surface-1 rounded"><p className="text-xs text-muted-foreground">Submitted by</p><p className="text-sm font-medium">{selected.submitted_by_name ?? "—"}</p></div>
              <div className="p-2 bg-surface-1 rounded"><p className="text-xs text-muted-foreground">Date</p><p className="text-sm font-medium">{formatDate(selected.created_at)}</p></div>
            </div>
            {selected.receipt_url && (
              <a href={selected.receipt_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-greek-600 hover:underline p-3 rounded-lg border border-border">
                <Receipt size={16} />
                View receipt
              </a>
            )}
            {selected.rejection_reason && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-sm text-red-700">
                Rejection reason: {selected.rejection_reason}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
