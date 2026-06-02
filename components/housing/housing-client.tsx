"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building, Hammer, Home, Plus, Trash2, Users } from "lucide-react";
import toast from "react-hot-toast";
import {
  Badge, Button, Card, CardHeader, EmptyState, Input, Modal,
  PageHeader, Select, StatCard, Textarea,
} from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";

interface Room {
  id: string;
  room_number: string;
  capacity: number;
  floor: number | null;
  monthly_rent: number | null;
  notes: string | null;
}

interface Assignment {
  id: string;
  room_id: string;
  member_id: string;
  move_in: string | null;
  member_profiles: { full_name: string } | null;
}

interface MaintenanceRequest {
  id: string;
  description: string;
  priority: string;
  status: string;
  created_at: string;
  room_id: string | null;
  housing_rooms?: { room_number: string } | null;
}

export function HousingClient() {
  const { can, loading: permLoading } = usePermissions();
  const canManage = !permLoading && (can("manage_housing") || can("manage_org_settings"));

  const [orgId, setOrgId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>([]);
  const [roomOpen, setRoomOpen] = useState(false);
  const [maintOpen, setMaintOpen] = useState(false);
  const [roomForm, setRoomForm] = useState({
    roomNumber: "", capacity: "1", floor: "1", monthlyRent: "", notes: "",
  });
  const [maintForm, setMaintForm] = useState({
    roomId: "", description: "", priority: "medium",
  });

  const load = useCallback(async (oid: string) => {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();

    const { data: roomRows } = await supabase
      .from("housing_rooms")
      .select("*")
      .eq("org_id", oid)
      .order("room_number");

    const roomList = (roomRows ?? []) as Room[];
    const roomIds = roomList.map((r) => r.id);

    let assignRows: Assignment[] = [];
    if (roomIds.length > 0) {
      const { data } = await supabase
        .from("housing_assignments")
        .select("*, member_profiles(full_name)")
        .in("room_id", roomIds);
      assignRows = (data ?? []) as Assignment[];
    }

    const { data: maintRows } = await supabase
      .from("maintenance_requests")
      .select("*, housing_rooms(room_number)")
      .eq("org_id", oid)
      .order("created_at", { ascending: false })
      .limit(20);

    setRooms(roomList);
    setAssignments(assignRows);
    setMaintenance((maintRows ?? []) as MaintenanceRequest[]);
  }, []);

  useEffect(() => {
    async function init() {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: m } = await supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();
      if (m) {
        setOrgId(m.org_id);
        load(m.org_id);
      }
    }
    init();
  }, [load]);

  const occupancyByRoom = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of assignments) {
      map.set(a.room_id, (map.get(a.room_id) ?? 0) + 1);
    }
    return map;
  }, [assignments]);

  const totalCapacity = rooms.reduce((s, r) => s + Number(r.capacity ?? 1), 0);
  const occupiedBeds = assignments.length;
  const totalRent = rooms.reduce((s, r) => s + (r.monthly_rent ? Number(r.monthly_rent) : 0), 0);
  const openMaintenance = maintenance.filter((m) => m.status === "open").length;

  async function addRoom() {
    if (!orgId || !roomForm.roomNumber) return;
    const res = await fetch("/api/housing/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        roomNumber: roomForm.roomNumber,
        capacity: roomForm.capacity,
        floor: roomForm.floor,
        monthlyRent: roomForm.monthlyRent,
        notes: roomForm.notes,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "Failed to add room");
      return;
    }
    toast.success("Room added");
    setRoomOpen(false);
    setRoomForm({ roomNumber: "", capacity: "1", floor: "1", monthlyRent: "", notes: "" });
    load(orgId);
  }

  async function removeRoom(roomId: string) {
    if (!orgId || !confirm("Remove this room? Assignments will be deleted.")) return;
    const res = await fetch(`/api/housing/rooms?roomId=${roomId}&orgId=${orgId}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "Failed");
      return;
    }
    toast.success("Room removed");
    load(orgId);
  }

  async function submitMaintenance() {
    if (!orgId || !maintForm.description) return;
    const res = await fetch("/api/housing/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, ...maintForm, roomId: maintForm.roomId || null }),
    });
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "Failed");
      return;
    }
    toast.success("Maintenance request submitted");
    setMaintOpen(false);
    setMaintForm({ roomId: "", description: "", priority: "medium" });
    load(orgId);
  }

  async function updateMaintenanceStatus(id: string, status: string) {
    const res = await fetch("/api/housing/maintenance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "Failed");
      return;
    }
    toast.success("Status updated");
    if (orgId) load(orgId);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Housing"
        description="Room assignments, maintenance requests, and house management"
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" icon={<Hammer size={14} />} onClick={() => setMaintOpen(true)}>
              Report issue
            </Button>
            {canManage && (
              <Button size="sm" icon={<Plus size={14} />} onClick={() => setRoomOpen(true)}>
                Add room
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Rooms" value={rooms.length} icon={<Home size={18} />} />
        <StatCard title="Beds filled" value={`${occupiedBeds}/${totalCapacity}`} icon={<Users size={18} />} />
        <StatCard title="Monthly rent" value={totalRent > 0 ? formatCurrency(totalRent) : "—"} icon={<Building size={18} />} />
        <StatCard title="Open maintenance" value={openMaintenance} icon={<Hammer size={18} />} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Rooms" description="Assignments by room" />
          {rooms.length === 0 ? (
            <EmptyState
              icon={<Building size={20} />}
              title="No rooms configured"
              description="Add chapter house rooms to track occupancy."
              action={canManage ? <Button size="sm" onClick={() => setRoomOpen(true)}>Add room</Button> : undefined}
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {rooms.map((room) => {
                const occ = occupancyByRoom.get(room.id) ?? 0;
                const full = occ >= Number(room.capacity ?? 1);
                const names = assignments
                  .filter((a) => a.room_id === room.id)
                  .map((a) => a.member_profiles?.full_name)
                  .filter(Boolean)
                  .join(", ");
                return (
                  <div
                    key={room.id}
                    className={`p-3 rounded-lg border relative ${full ? "bg-racing-50 border-racing-200" : "bg-surface-1 border-border"}`}
                  >
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => removeRoom(room.id)}
                        className="absolute top-2 right-2 p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                    <p className="font-bold text-foreground">#{room.room_number}</p>
                    <p className="text-xs text-muted-foreground">Floor {room.floor ?? 1} · {occ}/{room.capacity}</p>
                    {room.monthly_rent != null && (
                      <p className="text-xs font-medium text-racing">{formatCurrency(Number(room.monthly_rent))}/mo</p>
                    )}
                    {names && <p className="text-xs text-muted-foreground mt-1 truncate">{names}</p>}
                    <Badge label={full ? "Full" : "Available"} color={full ? "green" : "gray"} className="mt-1" />
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Maintenance" description="Recent house issues" />
          {maintenance.length === 0 ? (
            <EmptyState
              icon={<Hammer size={20} />}
              title="No requests"
              description="Members can report maintenance issues from this page."
              action={<Button size="sm" variant="secondary" onClick={() => setMaintOpen(true)}>Report issue</Button>}
            />
          ) : (
            <div className="space-y-2">
              {maintenance.map((req) => (
                <div key={req.id} className="p-3 rounded-lg border border-border">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{req.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {req.housing_rooms?.room_number ? `Room #${req.housing_rooms.room_number} · ` : ""}
                        {formatDate(req.created_at)}
                      </p>
                    </div>
                    <Badge
                      label={req.status.replace("_", " ")}
                      color={req.status === "open" ? "yellow" : req.status === "resolved" ? "green" : "gray"}
                    />
                  </div>
                  {canManage && req.status === "open" && (
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="secondary" onClick={() => updateMaintenanceStatus(req.id, "in_progress")}>
                        In progress
                      </Button>
                      <Button size="sm" onClick={() => updateMaintenanceStatus(req.id, "resolved")}>
                        Resolve
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={roomOpen}
        onClose={() => setRoomOpen(false)}
        title="Add room"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRoomOpen(false)}>Cancel</Button>
            <Button onClick={addRoom} disabled={!roomForm.roomNumber}>Save</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Room number" value={roomForm.roomNumber} onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Capacity" type="number" value={roomForm.capacity} onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })} />
            <Input label="Floor" type="number" value={roomForm.floor} onChange={(e) => setRoomForm({ ...roomForm, floor: e.target.value })} />
          </div>
          <Input label="Monthly rent" type="number" value={roomForm.monthlyRent} onChange={(e) => setRoomForm({ ...roomForm, monthlyRent: e.target.value })} />
          <Textarea label="Notes" value={roomForm.notes} onChange={(e) => setRoomForm({ ...roomForm, notes: e.target.value })} rows={2} />
        </div>
      </Modal>

      <Modal
        open={maintOpen}
        onClose={() => setMaintOpen(false)}
        title="Report maintenance issue"
        footer={
          <>
            <Button variant="secondary" onClick={() => setMaintOpen(false)}>Cancel</Button>
            <Button onClick={submitMaintenance} disabled={!maintForm.description}>Submit</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Select
            label="Room (optional)"
            value={maintForm.roomId}
            onChange={(e) => setMaintForm({ ...maintForm, roomId: e.target.value })}
            options={[
              { value: "", label: "General / whole house" },
              ...rooms.map((r) => ({ value: r.id, label: `Room #${r.room_number}` })),
            ]}
          />
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
          <Textarea
            label="Description"
            value={maintForm.description}
            onChange={(e) => setMaintForm({ ...maintForm, description: e.target.value })}
            rows={3}
          />
        </div>
      </Modal>
    </div>
  );
}
