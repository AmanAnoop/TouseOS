"use client";

import { useState } from "react";
import { Plus, Trash2, UserCheck, UserMinus } from "lucide-react";
import {
  Avatar, Badge, Button, Card, CardHeader,
  Input, Modal, Select,
} from "@/components/ui";
import { ROLE_LABELS } from "@/lib/permissions";
import type { OrgMember } from "@/types";

export interface OrgMemberWithProfile extends OrgMember {
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
  member_profiles?: { id: string; full_name: string; email: string } | null;
}

interface MemberRolesPanelProps {
  members: OrgMemberWithProfile[];
  isAdmin: boolean;
  onApprove: (memberId: string) => void;
  onChangeRole: (memberId: string, role: string) => void;
  onRemove: (memberId: string) => void;
  onInvite: (email: string, role: string) => Promise<void>;
}

const roleOptions = Object.entries(ROLE_LABELS)
  .filter(([v]) => !["parent", "university_admin"].includes(v))
  .map(([value, label]) => ({ value, label }));

export function MemberRolesPanel({
  members,
  isAdmin,
  onApprove,
  onChangeRole,
  onRemove,
  onInvite,
}: MemberRolesPanelProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("general_member");
  const [inviting, setInviting] = useState(false);

  const activeMembers = members.filter((m) => m.status !== "removed");
  const pendingMembers = members.filter((m) => m.status === "pending_invite");

  async function sendInvite() {
    if (!inviteEmail) return;
    setInviting(true);
    await onInvite(inviteEmail, inviteRole);
    setInviting(false);
    setInviteOpen(false);
    setInviteEmail("");
  }

  return (
    <div className="space-y-4">
      {pendingMembers.length > 0 && (
        <Card>
          <CardHeader title="Pending invites" description={`${pendingMembers.length} waiting for approval`} />
          <div className="space-y-2">
            {pendingMembers.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <Avatar name={String(m.profiles?.full_name ?? m.member_profiles?.full_name ?? "?")} src={m.profiles?.avatar_url} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{String(m.profiles?.full_name ?? m.member_profiles?.email ?? "Pending member")}</p>
                  <p className="text-xs text-muted-foreground capitalize">{m.role.replace("_", " ")}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" icon={<UserCheck size={12} />} onClick={() => onApprove(m.id)}>Approve</Button>
                  <Button size="sm" variant="danger" icon={<UserMinus size={12} />} onClick={() => onRemove(m.id)} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{activeMembers.length} active members</p>
        <Button size="sm" icon={<Plus size={14} />} onClick={() => setInviteOpen(true)}>Invite member</Button>
      </div>

      <Card padding="none">
        <div className="divide-y divide-border">
          {activeMembers.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-4 hover:bg-surface-1 transition-colors">
              <Avatar
                name={String(m.profiles?.full_name ?? m.member_profiles?.full_name ?? "?")}
                src={m.profiles?.avatar_url}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {String(m.profiles?.full_name ?? m.member_profiles?.full_name ?? "—")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {String(m.member_profiles?.email ?? "—")}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isAdmin ? (
                  <select
                    className="h-8 rounded-lg border border-border bg-background px-2 text-xs focus:outline-none"
                    value={m.role}
                    onChange={(e) => onChangeRole(m.id, e.target.value)}
                  >
                    {roleOptions.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                ) : (
                  <Badge label={ROLE_LABELS[m.role as keyof typeof ROLE_LABELS] ?? m.role} color="gray" />
                )}
                <Badge label={m.status} color={m.status === "active" ? "green" : "yellow"} dot />
                {isAdmin && m.role !== "owner" && (
                  <button onClick={() => onRemove(m.id)} className="p-1 rounded text-muted-foreground hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite member"
        footer={
          <>
            <Button variant="secondary" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={sendInvite} loading={inviting} disabled={!inviteEmail}>Send invite</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Email address" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="member@university.edu" />
          <Select label="Role" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} options={roleOptions} />
        </div>
      </Modal>
    </div>
  );
}
