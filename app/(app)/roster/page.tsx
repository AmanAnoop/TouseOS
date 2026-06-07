"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Papa from "papaparse";
import {
  Download, Mail, Upload, UserPlus,
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
  const { orgId, orgType, role: myRole, loading: orgLoading } = useOrg();
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [invitedMembers, setInvitedMembers] = useState<MemberProfile[]>([]);
  const [rosterTab, setRosterTab] = useState<"roster" | "invited">("roster");
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [massInviteOpen, setMassInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [bulkEmails, setBulkEmails] = useState("");
  const [sendInviteSms, setSendInviteSms] = useState(false);
  const [twilioLive, setTwilioLive] = useState<boolean | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState("general_member");
  const [inviting, setInviting] = useState(false);
  const [importing, setImporting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const loadMembers = useCallback(async (oid: string) => {
    setLoading(true);
    const [rosterRes, invitedRes] = await Promise.all([
      fetch(`/api/members?org_id=${encodeURIComponent(oid)}&scope=roster&include_payments=1`),
      fetch(`/api/members?org_id=${encodeURIComponent(oid)}&scope=invited`),
    ]);
    if (rosterRes.ok) {
      setMembers((await rosterRes.json()) as MemberProfile[]);
    } else {
      const err = await rosterRes.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? "Failed to load roster");
    }
    if (invitedRes.ok) {
      setInvitedMembers((await invitedRes.json()) as MemberProfile[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (orgLoading) return;
    if (orgId) loadMembers(orgId);
    else setLoading(false);
  }, [orgId, orgLoading, loadMembers]);

  useEffect(() => {
    fetch("/api/integrations/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const twilio = data?.integrations?.find((i: { id: string }) => i.id === "twilio");
        setTwilioLive(Boolean(twilio?.live));
      })
      .catch(() => setTwilioLive(false));
  }, []);

  useEffect(() => {
    if (!orgId) return;
    fetch(`/api/org/settings?org_id=${encodeURIComponent(orgId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setInviteCode(data?.org?.invite_code ? String(data.org.invite_code) : null));
  }, [orgId]);

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

  function parseBulkInviteLines(raw: string): Array<{ email: string; phone?: string }> {
    return [...new Set(raw.split("\n").map((line) => line.trim()).filter(Boolean))].map((line) => {
      const parts = line.split(/[,;\t]/).map((p) => p.trim()).filter(Boolean);
      const email = parts.find((p) => p.includes("@")) ?? "";
      const phone = parts.find((p) => !p.includes("@") && /[\d+()]/.test(p));
      return { email, phone };
    }).filter((row) => row.email);
  }

  async function sendInvite(email?: string, emails?: string[], phone?: string, phones?: string[]) {
    if (!orgId) return;
    setInviting(true);
    const res = await fetch("/api/members/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        email,
        emails,
        phone,
        phones,
        role: inviteRole,
        sendSms: sendInviteSms,
      }),
    });
    setInviting(false);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      toast.success((data as { message?: string }).message ?? "Invites sent");
      setInviteOpen(false);
      setMassInviteOpen(false);
      setInviteEmail("");
      setInvitePhone("");
      setBulkEmails("");
      setSendInviteSms(false);
      loadMembers(orgId);
    } else {
      toast.error((data as { error?: string }).error ?? "Failed to send invite");
    }
  }

  async function copyInviteLink() {
    if (!inviteCode) return;
    const link = `${window.location.origin}/join/${inviteCode}`;
    await navigator.clipboard.writeText(link);
    toast.success("Invite link copied");
  }

  const roleOptions = Object.entries(ROLE_LABELS).map(([v, l]) => ({ value: v, label: l }));

  return (
    <div className="ds-page-stack">
      <PageHeader
        title={isSportsOrg(orgType) ? "Team Roster" : "Member Roster"}
        description={`${members.length} members${invitedMembers.length ? ` · ${invitedMembers.length} invited` : ""}`}
        breadcrumb={isSportsOrg(orgType) ? "Team" : "Organization"}
        action={
          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" size="sm" icon={<Upload size={14} />} onClick={() => importRef.current?.click()} loading={importing}>Import CSV</Button>
            <input ref={importRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvImport(f); e.target.value = ""; }} />
            <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={exportRoster}>
              Export
            </Button>
            <Button size="sm" variant="secondary" icon={<UserPlus size={14} />} onClick={() => setMassInviteOpen(true)}>
              Mass invite
            </Button>
            <Button size="sm" variant="secondary" icon={<Mail size={14} />} onClick={() => setInviteOpen(true)}>
              Invite member
            </Button>
          </div>
        }
      />

      {orgId && isSportsOrg(orgType) && <SportsEligibilitySummary orgId={orgId} />}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 p-1 rounded-lg bg-surface-1 border border-border">
          <button
            type="button"
            className={`px-3 py-1.5 text-sm rounded-md ${rosterTab === "roster" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
            onClick={() => setRosterTab("roster")}
          >
            Roster ({members.length})
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 text-sm rounded-md ${rosterTab === "invited" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
            onClick={() => setRosterTab("invited")}
          >
            Invited ({invitedMembers.length})
          </button>
        </div>
        {rosterTab === "roster" && (
          <>
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
          </>
        )}
      </div>

      {rosterTab === "invited" ? (
        !loading && invitedMembers.length === 0 ? (
          <EmptyState icon={<Mail size={20} />} title="No pending invites" description="Invited members appear here until they join." />
        ) : (
          <MemberTable members={invitedMembers} loading={loading} showPayment={false} showInviteMeta />
        )
      ) : !loading && filtered.length === 0 ? (
        <EmptyState icon={<UserPlus size={20} />} title="No members found" description="Try adjusting your filters." />
      ) : (
        <MemberTable members={filtered} loading={loading} showPayment={showPayment} showDuesDetail={showPayment} />
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
            <Button
              onClick={() => sendInvite(inviteEmail, undefined, invitePhone || undefined)}
              disabled={!inviteEmail}
              loading={inviting}
            >
              Send invite
            </Button>
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
          <Input
            label="Phone (optional — for SMS invite)"
            type="tel"
            placeholder="+1 (555) 000-0000"
            value={invitePhone}
            onChange={(e) => setInvitePhone(e.target.value)}
          />
          <Select
            label="Role"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            options={roleOptions}
          />
          {twilioLive === false && (
            <p className="type-small" style={{ color: "var(--color-text-tertiary)" }}>
              Configure Twilio in Settings → Integrations to text invite links.
            </p>
          )}
          {twilioLive && (
            <label className="type-small flex items-center gap-2">
              <input
                type="checkbox"
                checked={sendInviteSms}
                onChange={(e) => setSendInviteSms(e.target.checked)}
                disabled={!invitePhone.trim()}
              />
              Also text invite link via Twilio
            </label>
          )}
        </div>
      </Modal>

      <Modal
        open={massInviteOpen}
        onClose={() => setMassInviteOpen(false)}
        title="Mass invite"
        description="Share your chapter link or paste multiple emails at once."
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setMassInviteOpen(false)}>Cancel</Button>
            <Button
              loading={inviting}
              disabled={parseBulkInviteLines(bulkEmails).length === 0}
              onClick={() => {
                const rows = parseBulkInviteLines(bulkEmails);
                sendInvite(
                  undefined,
                  rows.map((r) => r.email),
                  undefined,
                  rows.map((r) => r.phone).filter((p): p is string => Boolean(p)),
                );
              }}
            >
              Send invites
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {inviteCode && (
            <div className="p-3 rounded-lg border border-border bg-surface-1 space-y-2">
              <p className="text-sm font-medium">Shareable invite link</p>
              <p className="text-xs text-muted-foreground break-all">{typeof window !== "undefined" ? `${window.location.origin}/join/${inviteCode}` : `/join/${inviteCode}`}</p>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="secondary" onClick={copyInviteLink}>Copy link</Button>
                <Button size="sm" variant="secondary" onClick={async () => {
                  await navigator.clipboard.writeText(inviteCode);
                  toast.success("Invite code copied");
                }}>Copy code {inviteCode}</Button>
              </div>
            </div>
          )}
          <Select
            label="Default role for new members"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            options={roleOptions}
          />
          <div className="ds-field">
            <label className="type-label" htmlFor="bulk-emails">Paste emails</label>
            <textarea
              id="bulk-emails"
              className="ds-input"
              rows={6}
              placeholder="email@school.edu, +15551234567&#10;or one email per line (add phone after comma for SMS)"
              value={bulkEmails}
              onChange={(e) => setBulkEmails(e.target.value)}
            />
            <p className="type-small" style={{ color: "var(--color-text-tertiary)" }}>
              {parseBulkInviteLines(bulkEmails).length} valid address{parseBulkInviteLines(bulkEmails).length !== 1 ? "es" : ""}
            </p>
          </div>
          {twilioLive && (
            <label className="type-small flex items-center gap-2">
              <input
                type="checkbox"
                checked={sendInviteSms}
                onChange={(e) => setSendInviteSms(e.target.checked)}
              />
              Text invite link via Twilio when phone numbers are included
            </label>
          )}
        </div>
      </Modal>
    </div>
  );
}
