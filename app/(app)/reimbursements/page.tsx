"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  CheckCircle, Clock, DollarSign, Download, Plus,
  Receipt, Upload, X, XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import {
  Badge, Button, Card, EmptyState,
  Input, Modal, PageHeader, Select, StatCard, Tabs, Textarea,
} from "@/components/ui";
import { downloadCsv, formatCurrency, formatDate } from "@/lib/utils";
import type { Reimbursement } from "@/types";
import { ReimbursementList } from "@/components/reimbursements/reimbursement-list";
import { useOrg } from "@/hooks/use-org";
import {
  DEFAULT_REIMBURSEMENT_THRESHOLD,
  needsPresidentApproval,
} from "@/lib/reimbursement-approval";
import { can } from "@/lib/permissions";

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
  const { orgId, role: myRole } = useOrg();
  const fileRef = useRef<HTMLInputElement>(null);
  const [reimbs, setReimbs] = useState<Reimbursement[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [submitOpen, setSubmitOpen] = useState(false);
  const [selected, setSelected] = useState<Reimbursement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");

  const [form, setForm] = useState({
    amount: "", category: "Food & catering", description: "",
    eventId: "", receiptUrl: "",
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [events, setEvents] = useState<Array<{ id: string; title: string }>>([]);

  const canReview = can(myRole, "manage_payments") || can(myRole, "manage_budget");

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const res = await fetch(`/api/reimbursements?org_id=${encodeURIComponent(oid)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to load reimbursements");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setReimbs((data ?? []) as Reimbursement[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!orgId) return;
    supabase
      .from("events")
      .select("id, title")
      .eq("org_id", orgId)
      .order("starts_at", { ascending: false })
      .limit(30)
      .then(({ data: eRes }) => setEvents((eRes ?? []) as Array<{ id: string; title: string }>));
    load(orgId);
  }, [supabase, orgId, load]);

  async function submitReimbursement() {
    if (!orgId || !form.amount || !form.description) return;
    setUploading(true);

    let receiptUrl = form.receiptUrl;
    if (receiptFile) {
      const path = `${orgId}/receipts/${Date.now()}-${receiptFile.name}`;
      const { data: stored, error } = await supabase.storage.from("receipts").upload(path, receiptFile, { upsert: false });
      if (error) { toast.error(error.message); setUploading(false); return; }
      const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(stored.path);
      receiptUrl = urlData.publicUrl;
    }

    const res = await fetch("/api/reimbursements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        amount: form.amount,
        category: form.category,
        description: form.description,
        eventId: form.eventId || null,
        receiptUrl: receiptUrl || null,
      }),
    });

    setUploading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error ?? "Failed to submit");
      return;
    }
    toast.success("Reimbursement submitted");
    setSubmitOpen(false);
    setForm({ amount: "", category: "Food & catering", description: "", eventId: "", receiptUrl: "" });
    setReceiptFile(null);
    load(orgId);
  }

  async function updateStatus(
    id: string,
    status: string,
    options?: { approvalType?: "treasurer" | "president"; rejectionReason?: string },
  ) {
    if (!orgId) return;
    setActionLoading(true);

    const res = await fetch("/api/reimbursements", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        status: options?.approvalType ? undefined : status,
        approvalType: options?.approvalType,
        rejectionReason: options?.rejectionReason,
      }),
    });

    setActionLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error ?? "Update failed");
      return;
    }

    setReimbs((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } as Reimbursement : r)));
    toast.success(data.message ?? "Request updated");
    setSelected(null);
    setRejectNotes("");
    load(orgId);
  }

  function handleReject() {
    if (!selected) return;
    const reason = rejectNotes.trim();
    if (!reason) {
      toast.error("Add a short reason for the member");
      return;
    }
    updateStatus(selected.id, "rejected", { rejectionReason: reason });
  }

  const filtered = reimbs.filter((r) => {
    if (tab === "pending") return ["submitted", "needs_info"].includes(r.status);
    if (tab === "approved") return r.status === "approved";
    if (tab === "paid") return r.status === "paid";
    if (tab === "rejected") return r.status === "rejected";
    return true;
  });

  const pendingCount = reimbs.filter((r) => ["submitted", "needs_info"].includes(r.status)).length;
  const totalPending = reimbs
    .filter((r) => ["submitted", "needs_info", "approved"].includes(r.status))
    .reduce((s, r) => s + Number(r.amount), 0);
  const totalPaid = reimbs.filter((r) => r.status === "paid").reduce((s, r) => s + Number(r.amount), 0);

  const threshold = selected
    ? (selected.approval_threshold ?? DEFAULT_REIMBURSEMENT_THRESHOLD)
    : DEFAULT_REIMBURSEMENT_THRESHOLD;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reimbursements"
        description={`${pendingCount} pending · ${formatCurrency(totalPending)} in pipeline`}
        action={
          <div className="flex gap-2 flex-wrap">
            <Link href="/budget"><Button variant="secondary" size="sm">Budget</Button></Link>
            <Link href="/payments"><Button variant="secondary" size="sm">Payments</Button></Link>
            {canReview && (
              <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={() => downloadCsv("reimbursements.csv", reimbs.map((r) => ({ Submitter: r.submitted_by_name ?? "", Amount: r.amount, Category: r.category, Description: r.description, Status: r.status, Date: formatDate(r.created_at) })))}>Export</Button>
            )}
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setSubmitOpen(true)}>Request reimbursement</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Pending" value={pendingCount} deltaType={pendingCount > 0 ? "down" : "neutral"} icon={<Clock size={18} />} />
        <StatCard title="In pipeline" value={formatCurrency(totalPending)} icon={<DollarSign size={18} />} />
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
        <div className="space-y-2">{[1, 2, 3].map((i) => <Card key={i} className="h-16 animate-pulse bg-surface-2 border-0">&nbsp;</Card>)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Receipt size={24} />}
          title={tab === "pending" ? "No pending requests" : "No reimbursements found"}
          description="Submit a reimbursement request after spending chapter funds."
          action={tab === "pending" ? <Button size="sm" icon={<Plus size={14} />} onClick={() => setSubmitOpen(true)}>Submit request</Button> : undefined}
        />
      ) : (
        <ReimbursementList
          items={filtered}
          onSelect={setSelected}
          showApprovalHints={tab === "pending" && canReview}
        />
      )}

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

          <div>
            <label className="text-sm font-medium block mb-1.5">Receipt</label>
            <div
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${receiptFile ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/40"}`}
            >
              {receiptFile ? (
                <div className="flex items-center justify-center gap-2">
                  <Receipt size={16} className="text-primary" />
                  <p className="text-sm font-medium text-foreground">{receiptFile.name}</p>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setReceiptFile(null); }} className="text-muted-foreground hover:text-red-500">
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

      <Modal
        open={!!selected}
        onClose={() => { setSelected(null); setRejectNotes(""); }}
        title={selected?.description ?? ""}
        size="md"
        footer={
          <div className="flex gap-2 flex-wrap w-full">
            {canReview && selected?.status === "submitted" && (
              <>
                <Button loading={actionLoading} onClick={() => updateStatus(selected.id, "approved", { approvalType: "treasurer" })} icon={<CheckCircle size={14} />}>Treasurer approve</Button>
                {selected && needsPresidentApproval(selected) && (
                  <Button loading={actionLoading} onClick={() => updateStatus(selected.id, "approved", { approvalType: "president" })}>President approve</Button>
                )}
                <Button variant="secondary" loading={actionLoading} onClick={() => updateStatus(selected.id, "needs_info", { rejectionReason: rejectNotes || "More information needed" })}>Need info</Button>
                <Button variant="danger" loading={actionLoading} onClick={handleReject} icon={<XCircle size={14} />}>Reject</Button>
              </>
            )}
            {canReview && selected?.status === "approved" && (
              <Button loading={actionLoading} onClick={() => updateStatus(selected.id, "paid")} icon={<DollarSign size={14} />}>Mark as paid</Button>
            )}
            <Button variant="secondary" onClick={() => { setSelected(null); setRejectNotes(""); }} className="ml-auto">Close</Button>
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
            {canReview && needsPresidentApproval(selected) && selected.status === "submitted" && (
              <p className="text-xs text-muted-foreground">
                Amounts over {formatCurrency(threshold)} require treasurer and president approval.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2 bg-surface-1 rounded"><p className="text-xs text-muted-foreground">Submitted by</p><p className="text-sm font-medium">{selected.submitted_by_name ?? "—"}</p></div>
              <div className="p-2 bg-surface-1 rounded"><p className="text-xs text-muted-foreground">Date</p><p className="text-sm font-medium">{formatDate(selected.created_at)}</p></div>
            </div>
            {selected.receipt_url && (
              <a href={selected.receipt_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline p-3 rounded-lg border border-border">
                <Receipt size={16} />
                View receipt
              </a>
            )}
            {canReview && ["submitted", "needs_info"].includes(selected.status) && (
              <Textarea
                label="Notes for member (reject / need info)"
                placeholder="What receipt or detail is missing?"
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
              />
            )}
            {selected.rejection_reason && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-sm text-red-700">
                {selected.rejection_reason}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
