"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Building, Hammer, Home, Plus, Users } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
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
  member_profiles: { full_name: string } | null;
}

interface Maintenance {
  id: string;
  description: string;
  priority: string;
  status: string;
}

interface Member {
  id: string;
  full_name: string;
}

export function HousingClient() {
  const supabase = createClient();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [maintenance, setMaintenance] = useState<Maintenance[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomOpen, setRoomOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [maintOpen, setMaintOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [roomForm, setRoomForm] = useState({ roomNumber: "", capacity: "1", floor: "1", monthlyRent: "" });
  const [assignMemberId, setAssignMemberId] = useState("");
  const [maintForm, setMaintForm] = useState({ description: "", priority: "medium" });
  const [chargingRent, setChargingRent] = useState(false);

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const { data: roomData } = await supabase
      .from("housing_rooms")
      .select("*")
      .eq("org_id", oid)
      .order("room_number");

    const roomIds = (roomData ?? []).map((r) => r.id);
    const [assignRes, maintRes, membersRes] = await Promise.all([
      roomIds.length
        ? supabase.from("housing_assignments").select("*, member_profiles(full_name)").in("room_id", roomIds).is("move_out", null)
        : Promise.resolve({ data: [] }),
      supabase.from("maintenance_requests").select("*").eq("org_id", oid).order("created_at", { ascending: false }).limit(10),
      supabase.from("member_profiles").select("id, full_name").eq("org_id", oid).eq("membership_status", "active").order("full_name"),
    ]);

    setRooms((roomData ?? []) as Room[]);
    setAssignments((assignRes.data ?? []) as Assignment[]);
    setMaintenance((maintRes.data ?? []) as Maintenance[]);
    setMembers((membersRes.data ?? []) as Member[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: m } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).limit(1).single();
      if (m) {
        setOrgId(m.org_id);
        load(m.org_id);
      }
    }
    init();
  }, [supabase, load]);

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
      }),
    });
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Failed");
      return;
    }
    toast.success("Maintenance request submitted");
    setMaintOpen(false);
    setMaintForm({ description: "", priority: "medium" });
    load(orgId);
  }

  const totalCapacity = rooms.reduce((s, r) => s + (r.capacity ?? 1), 0);
  const totalRent = rooms.reduce((s, r) => s + (r.monthly_rent ? Number(r.monthly_rent) : 0), 0);
  const openMaintenance = maintenance.filter((m) => m.status === "open").length;

  async function createRentCharges() {
    if (!orgId) return;
    setChargingRent(true);
    const res = await fetch("/api/housing/rent-charges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId }),
    });
    setChargingRent(false);
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Failed to create rent charges");
      return;
    }
    toast.success(data.message ?? `Created ${data.created} rent charge(s)`);
    load(orgId);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Housing"
        description="Room assignments, maintenance requests, and house management"
        action={
          <div className="flex gap-2 flex-wrap">
            <Link href="/payments"><Button size="sm" variant="secondary">Payments</Button></Link>
            <Link href="/budget"><Button size="sm" variant="secondary">Budget</Button></Link>
            {assignments.length > 0 && totalRent > 0 && (
              <Button size="sm" variant="secondary" loading={chargingRent} onClick={createRentCharges}>
                Post monthly rent
              </Button>
            )}
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setRoomOpen(true)}>
              Add room
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total rooms" value={rooms.length} icon={<Home size={18} />} />
        <StatCard title="Capacity" value={totalCapacity} icon={<Users size={18} />} />
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
                      <p key={a.id} className="text-xs truncate mt-1">{a.member_profiles?.full_name}</p>
                    ))}
                    {!full && (
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
              {maintenance.map((req) => (
                <div key={req.id} className="flex items-start gap-3 p-2 rounded-lg border border-border">
                  <Badge
                    label={req.status.replace("_", " ")}
                    color={req.status === "open" ? "red" : req.status === "in_progress" ? "yellow" : "green"}
                  />
                  <p className="text-sm flex-1">{req.description}</p>
                </div>
              ))}
            </div>
          )}
          <Button variant="secondary" size="sm" className="w-full mt-3" onClick={() => setMaintOpen(true)}>
            Submit maintenance request
          </Button>
        </Card>
      </div>

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
    </div>
  );
}
