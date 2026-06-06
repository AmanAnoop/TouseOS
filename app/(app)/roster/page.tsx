"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Papa from "papaparse";
import {
  Download, Upload, UserPlus,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Button, EmptyState, Input, Modal,
  PageHeader, SearchInput, Select,
} from "@/components/ui";
import { downloadCsv } from "@/lib/utils";
import { ROLE_LABELS, can } from "@/lib/permissions";
import type { MemberProfile } from "@/types";
import { MemberTable } from "@/components/roster/member-table";
import { SportsEligibilitySummary } from "@/components/roster/sports-eligibility-summary";
import { isSportsOrg } from "@/lib/utils";
import { useOrg } from "@/hooks/use-org";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "new_member", label: "New member" },
  { value: "inactive", label: "Inactive" },
  { value: "alumni", label: "Alumni" },
  { value: "advisor", label: "Advisor" },
  { value: "suspended", label: "Suspended" },
];

const PAYMENT_OPTIONS = [
  { value: "", label: "Any payment status" },
  { value: "current", label: "Current" },
  { value: "overdue", label: "Overdue" },
];

export default function RosterPage() {
  const { orgId, orgType, role: myRole } = useOrg();
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);

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
    const res = await fetch(`/api/members?org_id=${encodeURIComponent(oid)}`);
    if (res.ok) {
      setMembers((await res.json()) as MemberProfile[]);
    } else {
      toast.error("Failed to load roster");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (orgId) loadMembers(orgId);
  }, [orgId, loadMembers]);

  const showPayment = can(myRole, "view_payments") || can(myRole, "manage_payments");

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
      "Payment Status": showPayment ? m.payment_status : "restricted",
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
    <div className="ds-page-stack">
      <PageHeader
        title={isSportsOrg(orgType) ? "Team Roster" : "Member Roster"}
        description={`${members.length} members`}
        breadcrumb={isSportsOrg(orgType) ? "Team" : "Organization"}
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

      {orgId && isSportsOrg(orgType) && <SportsEligibilitySummary orgId={orgId} />}

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
          className="ds-input ds-select h-9 min-h-9 text-sm"
          style={{ width: "auto", minWidth: 140 }}
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="ds-input ds-select h-9 min-h-9 text-sm"
          style={{ width: "auto", minWidth: 160 }}
        >
          {PAYMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {!loading && filtered.length === 0 ? (
        <EmptyState icon={<UserPlus size={20} />} title="No members found" description="Try adjusting your filters." />
      ) : (
        <MemberTable members={filtered} loading={loading} showPayment={showPayment} />
      )}

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
