"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Papa from "papaparse";
import { useRouter } from "next/navigation";
import {
  Download, Mail, Upload, UserPlus,
} from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import {
  Avatar, Badge, Button, Card, EmptyState, Input, Modal,
  PageHeader, SearchInput, Select, Skeleton, Table,
} from "@/components/ui";
import { cn, downloadCsv, getStatusColor } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/permissions";
import type { MemberProfile } from "@/types";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "new_member", label: "New member" },
  { value: "inactive", label: "Inactive" },
  { value: "alumni", label: "Alumni" },
  { value: "advisor", label: "Advisor" },
  { value: "suspended", label: "Suspended" },
  { value: "new_member", label: "New member" },
];

const PAYMENT_OPTIONS = [
  { value: "", label: "Any payment status" },
  { value: "current", label: "Current" },
  { value: "overdue", label: "Overdue" },
];

export default function RosterPage() {
  const supabase = createClient();
  const router = useRouter();
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("general_member");
  const [importing, setImporting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const loadMembers = useCallback(async (oid: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("member_profiles")
      .select("*")
      .eq("org_id", oid)
      .order("full_name");
    setMembers((data ?? []) as MemberProfile[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: m } = await supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", user.id)
        .neq("status", "removed")
        .limit(1)
        .single();
      if (m) {
        setOrgId(m.org_id);
        loadMembers(m.org_id);
      }
    }
    init();
  }, [supabase, loadMembers]);

  const filtered = members.filter((m) => {
    const q = query.toLowerCase();
    const matchesQuery =
      !q ||
      m.full_name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      (m.major ?? "").toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q);
    const matchesStatus = !statusFilter || m.membership_status === statusFilter;
    const matchesPayment = !paymentFilter || m.payment_status === paymentFilter;
    return matchesQuery && matchesStatus && matchesPayment;
  });

  function exportRoster() {
    downloadCsv("roster.csv", filtered.map((m) => ({
      Name: m.full_name,
      "Preferred Name": m.preferred_name ?? "",
      Email: m.email,
      Phone: m.phone ?? "",
      Role: m.role,
      Status: m.membership_status,
      "Class Year": m.class_year ?? "",
      Major: m.major ?? "",
      Hometown: m.hometown ?? "",
      "Payment Status": m.payment_status,
      "Attendance %": m.attendance_rate,
    })));
  }

  async function handleCsvImport(file: File) {
    if (!orgId) return;
    setImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const res = await fetch("/api/members/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orgId, rows: results.data }),
        });
        setImporting(false);
        if (res.ok) {
          const { imported } = await res.json();
          toast.success(`Imported ${imported} members`);
          loadMembers(orgId);
        } else {
          const err = await res.json();
          toast.error(err.error ?? "Import failed");
        }
      },
      error: () => { setImporting(false); toast.error("Could not parse CSV"); },
    });
  }

  async function sendInvite() {
    if (!orgId || !inviteEmail) return;
    const res = await fetch("/api/members/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, email: inviteEmail, role: inviteRole }),
    });
    if (res.ok) {
      toast.success(`Invite sent to ${inviteEmail}`);
      setInviteOpen(false);
      setInviteEmail("");
    } else {
      toast.error("Failed to send invite");
    }
  }

  const roleOptions = Object.entries(ROLE_LABELS).map(([v, l]) => ({ value: v, label: l }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Member Roster"
        description={`${members.length} members`}
        breadcrumb="Organization"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<Upload size={14} />} onClick={() => importRef.current?.click()} loading={importing}>Import CSV</Button>
            <input ref={importRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvImport(f); e.target.value = ""; }} />
            <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={exportRoster}>
              Export
            </Button>
            <Button size="sm" icon={<UserPlus size={14} />} onClick={() => setInviteOpen(true)}>
              Invite
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search name, email, major..."
          className="flex-1 min-w-[200px]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {PAYMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Member cards (mobile) */}
      <div className="grid gap-3 sm:hidden">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} padding="sm">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </Card>
            ))
          : filtered.length === 0
            ? <EmptyState icon={<UserPlus size={20} />} title="No members found" description="Try adjusting your filters." />
            : filtered.map((m) => (
                <Card
                  key={m.id}
                  padding="sm"
                  className="cursor-pointer hover:border-greek-300 transition-colors"
                  onClick={() => router.push(`/roster/${m.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={m.full_name} src={m.profile_photo_url} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground">{m.full_name}</p>
                      <p className="text-xs text-muted-foreground">{m.role.replace("_", " ")} · {m.major ?? "—"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge label={m.membership_status} color={getStatusColor(m.membership_status) as "green"} />
                      {m.payment_status === "overdue" && <Badge label="Overdue" color="red" />}
                    </div>
                  </div>
                  {(m.phone || m.email) && (
                    <div className="flex gap-3 mt-2 pt-2 border-t border-border">
                      {m.email && (
                        <a href={`mailto:${m.email}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-greek-600" onClick={(e) => e.stopPropagation()}>
                          <Mail size={12} />
                          {m.email}
                        </a>
                      )}
                    </div>
                  )}
                </Card>
              ))}
      </div>

      {/* Table (desktop) */}
      <Card padding="none" className="hidden sm:block overflow-hidden">
        <Table
          loading={loading}
          emptyMessage="No members match your filters."
          onRowClick={(row) => router.push(`/roster/${row.id}`)}
          columns={[
            {
              key: "full_name",
              header: "Member",
              render: (row) => (
                <div className="flex items-center gap-3">
                  <Avatar name={String(row.full_name)} src={row.profile_photo_url as string | null} size="sm" />
                  <div>
                    <p className="font-medium text-foreground">{String(row.full_name)}</p>
                    <p className="text-xs text-muted-foreground">{String(row.email)}</p>
                  </div>
                </div>
              ),
            },
            {
              key: "role",
              header: "Role",
              render: (row) => (
                <span className="text-sm text-muted-foreground capitalize">
                  {String(row.role).replace(/_/g, " ")}
                </span>
              ),
            },
            {
              key: "membership_status",
              header: "Status",
              render: (row) => (
                <Badge
                  label={String(row.membership_status)}
                  color={getStatusColor(String(row.membership_status)) as "green"}
                />
              ),
            },
            {
              key: "class_year",
              header: "Class",
              render: (row) => <span className="text-sm">{String(row.class_year ?? "—")}</span>,
            },
            {
              key: "payment_status",
              header: "Dues",
              render: (row) => (
                <Badge
                  label={String(row.payment_status)}
                  color={row.payment_status === "overdue" ? "red" : row.payment_status === "current" ? "green" : "yellow"}
                />
              ),
            },
            {
              key: "attendance_rate",
              header: "Attendance",
              render: (row): React.ReactNode => (
                <span className={cn("text-sm font-medium", Number(row.attendance_rate) < 75 ? "text-red-500" : "text-green-600")}>
                  {String(row.attendance_rate)}%
                </span>
              ),
            },
          ]}
          data={filtered as unknown as Record<string, unknown>[]}
        />
      </Card>

      {/* Invite modal */}
      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite member"
        description="An invite link will be sent to their email."
        footer={
          <>
            <Button variant="secondary" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={sendInvite} disabled={!inviteEmail}>Send invite</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Email address"
            type="email"
            placeholder="member@university.edu"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <Select
            label="Role"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            options={roleOptions}
          />
        </div>
      </Modal>
    </div>
  );
}
