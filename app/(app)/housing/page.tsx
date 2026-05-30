import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Badge, Button, Card, CardHeader, EmptyState, PageHeader, StatCard,
} from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { Building, DollarSign, Hammer, Home, Users } from "lucide-react";

export const metadata = { title: "Housing" };
export const dynamic = "force-dynamic";

export default async function HousingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: m } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).limit(1).single();
  if (!m) redirect("/onboarding");

  const [roomsRes, assignmentsRes, maintenanceRes] = await Promise.all([
    supabase.from("housing_rooms").select("*").eq("org_id", m.org_id).order("room_number"),
    supabase.from("housing_assignments").select("*, member_profiles(full_name)").eq(
      "room_id",
      // Get all room IDs for this org
      supabase.from("housing_rooms").select("id").eq("org_id", m.org_id)
    ),
    supabase.from("maintenance_requests").select("*").eq("org_id", m.org_id).order("created_at", { ascending: false }).limit(10),
  ]);

  const rooms = (roomsRes.data ?? []) as Array<Record<string, unknown>>;
  const maintenance = (maintenanceRes.data ?? []) as Array<Record<string, unknown>>;

  const totalCapacity = rooms.reduce((s, r) => s + Number(r.capacity ?? 1), 0);
  const occupied = rooms.filter((r) => r.occupied).length;
  const totalRent = rooms.reduce((s, r) => s + (r.monthly_rent ? Number(r.monthly_rent) : 0), 0);
  const openMaintenance = maintenance.filter((m) => m.status === "open").length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Housing"
        description="Room assignments, maintenance requests, and house management"
        action={<Button size="sm" icon={<Home size={14} />}>Add room</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total rooms" value={rooms.length} icon={<Home size={18} />} />
        <StatCard title="Capacity" value={totalCapacity} icon={<Users size={18} />} />
        <StatCard title="Monthly rent" value={totalRent > 0 ? formatCurrency(totalRent) : "—"} icon={<DollarSign size={18} />} />
        <StatCard title="Open maintenance" value={openMaintenance} deltaType={openMaintenance > 0 ? "down" : "neutral"} icon={<Hammer size={18} />} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Room grid */}
        <Card>
          <CardHeader title="Room assignments" icon={<Home size={16} />} />
          {rooms.length === 0 ? (
            <EmptyState
              icon={<Building size={20} />}
              title="No rooms configured"
              description="Add your chapter house rooms to start tracking assignments."
              action={<Button size="sm">Add rooms</Button>}
            />
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {rooms.map((room) => (
                <div
                  key={String(room.id)}
                  className={`p-3 rounded-lg border text-center ${room.occupied ? "bg-greek-50 dark:bg-greek-950/30 border-greek-200 dark:border-greek-900" : "bg-surface-1 border-border"}`}
                >
                  <p className="font-bold text-foreground">#{String(room.room_number)}</p>
                  <p className="text-xs text-muted-foreground">Floor {String(room.floor ?? 1)}</p>
                  <p className="text-xs text-muted-foreground">Cap: {String(room.capacity ?? 1)}</p>
                  {room.monthly_rent && (
                    <p className="text-xs font-medium text-greek-600">{formatCurrency(Number(room.monthly_rent))}/mo</p>
                  )}
                  <Badge
                    label={room.occupied ? "Occupied" : "Available"}
                    color={room.occupied ? "green" : "gray"}
                    className="mt-1"
                  />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Maintenance requests */}
        <Card>
          <CardHeader title="Maintenance requests" icon={<Hammer size={16} />} />
          {maintenance.length === 0 ? (
            <EmptyState icon={<Hammer size={20} />} title="No maintenance requests" />
          ) : (
            <div className="space-y-2">
              {maintenance.slice(0, 6).map((req) => (
                <div key={String(req.id)} className="flex items-start gap-3 p-2 rounded-lg hover:bg-surface-1 transition-colors border border-border">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${req.status === "open" ? "bg-red-500" : req.status === "in_progress" ? "bg-yellow-500" : "bg-green-500"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground line-clamp-1">{String(req.description)}</p>
                    <p className="text-xs text-muted-foreground capitalize">{String(req.priority)} priority</p>
                  </div>
                  <Badge
                    label={String(req.status).replace("_", " ")}
                    color={req.status === "open" ? "red" : req.status === "in_progress" ? "yellow" : "green"}
                  />
                </div>
              ))}
            </div>
          )}
          <Button variant="secondary" size="sm" className="w-full mt-3">Submit maintenance request</Button>
        </Card>
      </div>

      {/* Move-in checklist */}
      <Card>
        <CardHeader title="Move-in / Move-out checklist" description="Required documentation for all residents" />
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { title: "Room condition report", description: "Document existing damage before move-in" },
            { title: "House rules acknowledgment", description: "Resident signs house rules and policies" },
            { title: "Deposit paid", description: "Security deposit received and recorded" },
            { title: "Emergency contact on file", description: "Updated emergency contact info" },
            { title: "Keys issued", description: "Room key and mailbox key provided" },
            { title: "Parking assignment", description: "Parking spot assigned if applicable" },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3 p-3 rounded-lg border border-border">
              <input type="checkbox" className="rounded mt-0.5" />
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
