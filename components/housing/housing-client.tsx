"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Building, Hammer, Home, Plus, Users } from "lucide-react";
import toast from "react-hot-toast";
import { useOrg } from "@/hooks/use-org";
import { usePermissions } from "@/hooks/use-permissions";
import {
  Badge, Button, Card, CardHeader, EmptyState, Input, Modal, PageHeader, Select, StatCard, Textarea,
} from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

interface Room {
  id: string;
  room_number: string;
  capacity: number;
  floor: number | null;
  monthly_rent: number | null;
}

interface Assignment {
  id: string;
  room_id: string;
  member_id: string;
  rent_due_day: number | null;
  member_profiles: { full_name: string } | null;
}

interface Maintenance {
  id: string;
  room_id: string | null;
  description: string;
  priority: string;
  status: string;
}

interface HousingContact {
  id: string;
  name: string;
  role_label: string | null;
  category: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
}

interface Member {
  id: string;
  full_name: string;
}

export function HousingClient() {
  const { orgId } = useOrg();
  const { can } = usePermissions();
  const canManageHousing = can("manage_housing");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [maintenance, setMaintenance] = useState<Maintenance[]>([]);
  const [contacts, setContacts] = useState<HousingContact[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomOpen, setRoomOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [maintOpen, setMaintOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [editContact, setEditContact] = useState<HousingContact | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [roomForm, setRoomForm] = useState({ roomNumber: "", capacity: "1", floor: "1", monthlyRent: "" });
  const [assignMemberId, setAssignMemberId] = useState("");
  const [maintForm, setMaintForm] = useState({ description: "", priority: "medium", roomId: "" });
  const [contactForm, setContactForm] = useState({
    name: "", roleLabel: "", category: "general", phone: "", email: "", notes: "",
  });
  const [chargingRent, setChargingRent] = useState(false);
  const [savingRentConfig, setSavingRentConfig] = useState(false);
  const [rentOpen, setRentOpen] = useState(false);
  const [rentRecurring, setRentRecurring] = useState({ enabled: false, dueDay: 1 });
  const [rentDueDate, setRentDueDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });

  const CONTACT_STARTERS = [
    { name: "House manager", roleLabel: "On-call", category: "general" },
    { name: "Chapter landlord", roleLabel: "Lease contact", category: "landlord" },
    { name: "Campus facilities", roleLabel: "After-hours", category: "campus" },
    { name: "Preferred plumber", roleLabel: "Emergency", category: "plumber" },
    { name: "HVAC service", roleLabel: "Maintenance", category: "hvac" },
  ] as const;

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const [housingRes, membersRes] = await Promise.all([
      fetch(`/api/housing?org_id=${encodeURIComponent(oid)}`),
      fetch(`/api/members?org_id=${encodeURIComponent(oid)}`),
    ]);
    if (housingRes.ok) {
      const data = await housingRes.json();
      setRooms((data.rooms ?? []) as Room[]);
      setAssignments((data.assignments ?? []) as Assignment[]);
      setMaintenance((data.maintenance ?? []) as Maintenance[]);
      setContacts((data.contacts ?? []) as HousingContact[]);
    } else {
      toast.error("Failed to load housing data");
    }
    if (membersRes.ok) {
      const mems = (await membersRes.json()) as Array<{ id: string; full_name: string; membership_status: string }>;
      setMembers(
        mems.filter((m) => m.membership_status === "active").map((m) => ({ id: m.id, full_name: m.full_name })),
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (orgId) load(orgId);
  }, [orgId, load]);

  useEffect(() => {
    if (!orgId) return;
    fetch(`/api/org/settings?org_id=${encodeURIComponent(orgId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const cfg = ((data?.org?.settings ?? {}) as Record<string, unknown>).housing_rent as Record<string, unknown> | undefined;
        if (cfg) {
          setRentRecurring({
            enabled: Boolean(cfg.recurring_enabled),
            dueDay: Number(cfg.due_day ?? 1),
          });
        }
      });
  }, [orgId]);

  async function saveRentRecurring() {
    if (!orgId) return;
    setSavingRentConfig(true);
    const res = await fetch("/api/org/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        settingsPatch: {
          housing_rent: {
            recurring_enabled: rentRecurring.enabled,
            due_day: rentRecurring.dueDay,
          },
        },
      }),
    });
    setSavingRentConfig(false);
    if (!res.ok) {
      toast.error("Could not save rent schedule");
      return;
    }
    toast.success("Recurring rent settings saved");
  }

  function occupants(roomId: string) {
    return assignments.filter((a) => a.room_id === roomId);
  }

  async function addRoom() {
    if (!orgId || !roomForm.roomNumber) return;
    const res = await fetch("/api/housing/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        roomNumber: roomForm.roomNumber,
        capacity: Number(roomForm.capacity) || 1,
        floor: Number(roomForm.floor) || 1,
        monthlyRent: roomForm.monthlyRent ? Number(roomForm.monthlyRent) : null,
      }),
    });
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Failed");
      return;
    }
    toast.success("Room added");
    setRoomOpen(false);
    setRoomForm({ roomNumber: "", capacity: "1", floor: "1", monthlyRent: "" });
    load(orgId);
  }

  async function assignMember() {
    if (!selectedRoomId || !assignMemberId) return;
    const res = await fetch("/api/housing/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: selectedRoomId, memberId: assignMemberId }),
    });
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Failed");
      return;
    }
    toast.success("Member assigned");
    setAssignOpen(false);
    setAssignMemberId("");
    if (orgId) load(orgId);
  }

  async function submitMaintenance() {
    if (!orgId || !maintForm.description.trim()) return;
    const res = await fetch("/api/housing/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        description: maintForm.description,
        priority: maintForm.priority,
        roomId: maintForm.roomId || null,
      }),
    });
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Failed");
      return;
    }
    toast.success("Maintenance request submitted");
    setMaintOpen(false);
    setMaintForm({ description: "", priority: "medium", roomId: "" });
    load(orgId);
  }

  async function updateMaintenanceStatus(id: string, status: string) {
    if (!orgId) return;
    const res = await fetch("/api/housing/maintenance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, orgId, status }),
    });
    if (!res.ok) {
      toast.error("Could not update request");
      return;
    }
    toast.success("Request updated");
    load(orgId);
  }

  async function saveContact() {
    if (!orgId || !contactForm.name.trim()) return;
    const payload = {
      orgId,
      name: contactForm.name,
      roleLabel: contactForm.roleLabel,
      category: contactForm.category,
      phone: contactForm.phone,
      email: contactForm.email,
      notes: contactForm.notes,
    };
    const res = editContact
      ? await fetch("/api/housing/contacts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editContact.id, ...payload }),
      })
      : await fetch("/api/housing/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    if (!res.ok) {
      toast.error((await res.json().catch(() => ({}))).error ?? "Failed to save contact");
      return;
    }
    toast.success(editContact ? "Contact updated" : "Contact added");
    setContactOpen(false);
    setEditContact(null);
    setContactForm({ name: "", roleLabel: "", category: "general", phone: "", email: "", notes: "" });
    load(orgId);
  }

  async function updateRentDueDay(assignmentId: string, rentDueDay: string) {
    if (!orgId) return;
    const res = await fetch("/api/housing/assignments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: assignmentId,
        orgId,
        rentDueDay: rentDueDay === "" ? null : Number(rentDueDay),
      }),
    });
    if (!res.ok) {
      toast.error("Could not update due day");
      return;
    }
    toast.success("Rent due day updated");
    load(orgId);
  }

  async function deleteContact(id: string) {
    if (!orgId || !confirm("Remove this contact?")) return;
    const res = await fetch(`/api/housing/contacts?id=${id}&org_id=${encodeURIComponent(orgId)}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete contact");
      return;
    }
    load(orgId);
  }

  function openEditContact(c: HousingContact) {
    setEditContact(c);
    setContactForm({
      name: c.name,
      roleLabel: c.role_label ?? "",
      category: c.category,
      phone: c.phone ?? "",
      email: c.email ?? "",
      notes: c.notes ?? "",
    });
    setContactOpen(true);
  }

  const totalCapacity = rooms.reduce((s, r) => s + (r.capacity ?? 1), 0);
  const totalOccupied = assignments.length;
  const totalRent = rooms.reduce((s, r) => s + (r.monthly_rent ? Number(r.monthly_rent) : 0), 0);
  const openMaintenance = maintenance.filter((m) => m.status === "open").length;

  async function createRentCharges() {
    if (!orgId) return;
    setChargingRent(true);
    const monthLabel = new Date(`${rentDueDate}T12:00:00`).toLocaleString("en-US", { month: "long", year: "numeric" });
    const res = await fetch("/api/housing/rent-charges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, dueDate: rentDueDate, monthLabel }),
    });
    setChargingRent(false);
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Failed to create rent charges");
      return;
    }
    if (data.created === 0 && data.skipped > 0) {
      toast(data.message ?? "Rent already posted for this month", { icon: "ℹ️" });
    } else {
      toast.success(data.message ?? `Created ${data.created} rent charge(s)`);
    }
    setRentOpen(false);
    load(orgId);
  }

  function applyContactStarter(starter: typeof CONTACT_STARTERS[number]) {
    setEditContact(null);
    setContactForm({
      name: starter.name,
      roleLabel: starter.roleLabel,
      category: starter.category,
      phone: "",
      email: "",
      notes: "",
    });
    setContactOpen(true);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Housing"
        description="Room assignments, maintenance requests, and house management"
        action={
          canManageHousing ? (
            <div className="flex gap-2 flex-wrap justify-end items-center">
              <Link href="/payments"><Button size="sm" variant="secondary">Payments</Button></Link>
              <Link href="/budget"><Button size="sm" variant="secondary">Budget</Button></Link>
              <Button size="sm" icon={<Plus size={14} />} onClick={() => setRentOpen(true)}>
                Post monthly rent
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setEditContact(null);
                  setContactForm({ name: "", roleLabel: "", category: "general", phone: "", email: "", notes: "" });
                  setContactOpen(true);
                }}
              >
                Add contact
              </Button>
              <Button size="sm" icon={<Plus size={14} />} onClick={() => setRoomOpen(true)}>
                Add room
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap justify-end">
              <Link href="/payments"><Button size="sm" variant="secondary">Payments</Button></Link>
              <Link href="/budget"><Button size="sm" variant="secondary">Budget</Button></Link>
            </div>
          )
        }
      />

      {canManageHousing && (
        <Card padding="sm">
          <CardHeader
            title="Recurring rent"
            description="Automatically post rent charges on a set day each month"
          />
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="rounded"
                checked={rentRecurring.enabled}
                onChange={(e) => setRentRecurring({ ...rentRecurring, enabled: e.target.checked })}
              />
              <span className="text-sm">Enable auto-posting</span>
            </label>
            <Input
              label="Due day of month"
              type="number"
              min={1}
              max={28}
              className="w-32"
              value={String(rentRecurring.dueDay)}
              onChange={(e) => setRentRecurring({ ...rentRecurring, dueDay: Math.min(28, Math.max(1, Number(e.target.value) || 1)) })}
            />
            <Button size="sm" variant="secondary" loading={savingRentConfig} onClick={saveRentRecurring}>
              Save schedule
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total rooms" value={rooms.length} icon={<Home size={18} />} />
        <StatCard title="Occupied beds" value={`${totalOccupied}/${totalCapacity}`} icon={<Users size={18} />} />
        <StatCard title="Monthly rent" value={totalRent > 0 ? formatCurrency(totalRent) : "—"} icon={<Building size={18} />} />
        <StatCard title="Open maintenance" value={openMaintenance} deltaType={openMaintenance > 0 ? "down" : "neutral"} icon={<Hammer size={18} />} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Room assignments" icon={<Home size={16} />} />
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : rooms.length === 0 ? (
            <EmptyState
              icon={<Building size={20} />}
              title="No rooms configured"
              description="Add your chapter house rooms to start tracking assignments."
              action={<Button size="sm" onClick={() => setRoomOpen(true)}>Add room</Button>}
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {rooms.map((room) => {
                const occ = occupants(room.id);
                const full = occ.length >= (room.capacity ?? 1);
                return (
                  <div
                    key={room.id}
                    className={`p-3 rounded-lg border text-left ${full ? "bg-greek-50 border-greek-200" : "bg-surface-1 border-border"}`}
                  >
                    <p className="font-bold text-foreground">#{room.room_number}</p>
                    <p className="text-xs text-muted-foreground">Floor {room.floor ?? 1}</p>
                    <p className="text-xs text-muted-foreground">
                      {occ.length}/{room.capacity ?? 1} occupied
                    </p>
                    {room.monthly_rent != null && (
                      <p className="text-xs font-medium text-greek-600">{formatCurrency(Number(room.monthly_rent))}/mo</p>
                    )}
                    {occ.map((a) => (
                      <div key={a.id} className="mt-1 space-y-1">
                        <p className="text-xs truncate">{a.member_profiles?.full_name}</p>
                        {canManageHousing && (
                          <select
                            className="w-full text-[10px] border border-border rounded px-1 py-0.5 bg-background"
                            value={a.rent_due_day ?? ""}
                            onChange={(e) => updateRentDueDay(a.id, e.target.value)}
                            aria-label={`Rent due day for ${a.member_profiles?.full_name}`}
                          >
                            <option value="">Org default due day</option>
                            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                              <option key={d} value={d}>Due on the {d}{d === 1 ? "st" : d === 2 ? "nd" : d === 3 ? "rd" : "th"}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    ))}
                    {!full && canManageHousing && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full mt-2"
                        onClick={() => {
                          setSelectedRoomId(room.id);
                          setAssignOpen(true);
                        }}
                      >
                        Assign
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Maintenance requests" icon={<Hammer size={16} />} />
          {maintenance.length === 0 ? (
            <EmptyState icon={<Hammer size={20} />} title="No maintenance requests" />
          ) : (
            <div className="space-y-2">
              {maintenance.map((req) => {
                const room = rooms.find((r) => r.id === req.room_id);
                return (
                <div key={req.id} className="flex items-start gap-3 p-2 rounded-lg border border-border flex-wrap">
                  <Badge
                    label={req.status.replace("_", " ")}
                    color={req.status === "open" ? "red" : req.status === "in_progress" ? "yellow" : "green"}
                  />
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-sm">{req.description}</p>
                    {room && <p className="text-xs text-muted-foreground">Room #{room.room_number}</p>}
                  </div>
                  {canManageHousing && req.status !== "resolved" && req.status !== "closed" && (
                    <div className="flex gap-1">
                      {req.status === "open" && (
                        <Button size="sm" variant="secondary" onClick={() => updateMaintenanceStatus(req.id, "in_progress")}>Start</Button>
                      )}
                      <Button size="sm" onClick={() => updateMaintenanceStatus(req.id, "resolved")}>Resolve</Button>
                    </div>
                  )}
                </div>
              );
              })}
            </div>
          )}
          <Button variant="secondary" size="sm" className="w-full mt-3" onClick={() => setMaintOpen(true)}>
            Submit maintenance request
          </Button>
        </Card>
      </div>

      <Card>
        <CardHeader title="Local contacts" description="House manager, plumber, landlord, campus facilities" />
        {canManageHousing && contacts.length === 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {CONTACT_STARTERS.map((starter) => (
              <Button key={starter.name} size="sm" variant="secondary" onClick={() => applyContactStarter(starter)}>
                + {starter.name}
              </Button>
            ))}
          </div>
        )}
        {contacts.length === 0 ? (
          <EmptyState
            title="No contacts yet"
            description={canManageHousing
              ? "Add contacts your chapter uses for housing emergencies and repairs."
              : "Housing officers maintain emergency contacts for the chapter house."}
          />
        ) : (
          <div className="space-y-2">
            {contacts.map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border">
                <div>
                  <p className="font-medium text-sm">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[c.role_label, c.category].filter(Boolean).join(" · ")}
                  </p>
                  {(c.phone || c.email) && (
                    <p className="text-xs mt-1">
                      {c.phone}{c.phone && c.email ? " · " : ""}{c.email}
                    </p>
                  )}
                  {c.notes && <p className="text-xs text-muted-foreground mt-1">{c.notes}</p>}
                </div>
                {canManageHousing && (
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="sm" variant="secondary" onClick={() => openEditContact(c)}>Edit</Button>
                    <Button size="sm" variant="secondary" onClick={() => deleteContact(c.id)}>Remove</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={roomOpen} onClose={() => setRoomOpen(false)} title="Add room" footer={
        <>
          <Button variant="secondary" onClick={() => setRoomOpen(false)}>Cancel</Button>
          <Button onClick={addRoom}>Save</Button>
        </>
      }>
        <div className="space-y-3">
          <Input label="Room number" value={roomForm.roomNumber} onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })} placeholder="101" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Capacity" type="number" value={roomForm.capacity} onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })} />
            <Input label="Floor" type="number" value={roomForm.floor} onChange={(e) => setRoomForm({ ...roomForm, floor: e.target.value })} />
          </div>
          <Input label="Monthly rent ($)" type="number" value={roomForm.monthlyRent} onChange={(e) => setRoomForm({ ...roomForm, monthlyRent: e.target.value })} />
        </div>
      </Modal>

      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign member" footer={
        <>
          <Button variant="secondary" onClick={() => setAssignOpen(false)}>Cancel</Button>
          <Button onClick={assignMember} disabled={!assignMemberId}>Assign</Button>
        </>
      }>
        <Select
          label="Member"
          value={assignMemberId}
          onChange={(e) => setAssignMemberId(e.target.value)}
          placeholder="Select member"
          options={members.map((m) => ({ value: m.id, label: m.full_name }))}
        />
      </Modal>

      <Modal open={maintOpen} onClose={() => setMaintOpen(false)} title="Maintenance request" footer={
        <>
          <Button variant="secondary" onClick={() => setMaintOpen(false)}>Cancel</Button>
          <Button onClick={submitMaintenance}>Submit</Button>
        </>
      }>
        <div className="space-y-3">
          <Select
            label="Room (optional)"
            value={maintForm.roomId}
            onChange={(e) => setMaintForm({ ...maintForm, roomId: e.target.value })}
            placeholder="Whole house / common area"
            options={rooms.map((r) => ({ value: r.id, label: `#${r.room_number}` }))}
          />
          <Textarea label="Description" value={maintForm.description} onChange={(e) => setMaintForm({ ...maintForm, description: e.target.value })} />
          <Select
            label="Priority"
            value={maintForm.priority}
            onChange={(e) => setMaintForm({ ...maintForm, priority: e.target.value })}
            options={[
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
              { value: "urgent", label: "Urgent" },
            ]}
          />
        </div>
      </Modal>

      <Modal open={rentOpen} onClose={() => setRentOpen(false)} title="Post monthly rent charges" footer={
        <>
          <Button variant="secondary" onClick={() => setRentOpen(false)}>Cancel</Button>
          <Button loading={chargingRent} onClick={createRentCharges}>Create charges</Button>
        </>
      }>
        <div className="space-y-3">
          <Input
            label="Rent due date"
            type="date"
            value={rentDueDate}
            onChange={(e) => setRentDueDate(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Creates one charge per assigned member based on room rent. Charges appear under Housing on Payments and Budget.
          </p>
        </div>
      </Modal>

      <Modal open={contactOpen} onClose={() => { setContactOpen(false); setEditContact(null); }} title={editContact ? "Edit contact" : "Add local contact"} footer={
        <>
          <Button variant="secondary" onClick={() => { setContactOpen(false); setEditContact(null); }}>Cancel</Button>
          <Button onClick={saveContact} disabled={!contactForm.name.trim()}>Save</Button>
        </>
      }>
        <div className="space-y-3">
          <Input label="Name *" value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} placeholder="Campus maintenance" />
          <Input label="Role" value={contactForm.roleLabel} onChange={(e) => setContactForm({ ...contactForm, roleLabel: e.target.value })} placeholder="Facilities after-hours" />
          <Select
            label="Category"
            value={contactForm.category}
            onChange={(e) => setContactForm({ ...contactForm, category: e.target.value })}
            options={[
              { value: "general", label: "General" },
              { value: "plumber", label: "Plumber" },
              { value: "electrician", label: "Electrician" },
              { value: "landlord", label: "Landlord" },
              { value: "campus", label: "Campus" },
              { value: "hvac", label: "HVAC" },
            ]}
          />
          <Input label="Phone" type="tel" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} />
          <Input label="Email" type="email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
          <Textarea label="Notes" value={contactForm.notes} onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
