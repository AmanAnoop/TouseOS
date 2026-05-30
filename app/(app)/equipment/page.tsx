import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Badge, Button, Card, CardHeader, EmptyState, PageHeader, StatCard,
} from "@/components/ui";
import { Package, Plus, RotateCcw, Wrench } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Equipment & Uniforms" };
export const dynamic = "force-dynamic";

export default async function EquipmentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: m } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).limit(1).single();
  if (!m) redirect("/onboarding");

  const [equipRes, assignRes] = await Promise.all([
    supabase.from("sports_equipment").select("*").eq("org_id", m.org_id).order("category").order("item_name"),
    supabase.from("sports_equipment_assignments").select("*, member_profiles(full_name), sports_equipment(item_name)").eq(
      "equipment_id",
      supabase.from("sports_equipment").select("id").eq("org_id", m.org_id),
    ).is("returned_at", null),
  ]);

  const equipment = (equipRes.data ?? []) as Array<Record<string, unknown>>;
  const assignments = (assignRes.data ?? []) as Array<Record<string, unknown>>;

  const totalItems = equipment.reduce((s, e) => s + Number(e.quantity_total ?? 0), 0);
  const available = equipment.reduce((s, e) => s + Number(e.quantity_available ?? 0), 0);
  const outItems = totalItems - available;
  const damaged = assignments.filter((a) => a.condition === "damaged" || a.condition === "lost").length;

  const byCategory = equipment.reduce<Record<string, typeof equipment>>((acc, item) => {
    const cat = String(item.category ?? "general");
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <PageHeader
        title="Equipment & Uniforms"
        description="Track team inventory, issued equipment, and return status"
        action={<Button size="sm" icon={<Plus size={14} />}>Add item</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total items" value={totalItems} icon={<Package size={18} />} />
        <StatCard title="Available" value={available} deltaType="up" icon={<Package size={18} />} />
        <StatCard title="Issued out" value={outItems} icon={<RotateCcw size={18} />} />
        <StatCard title="Damaged/lost" value={damaged} deltaType={damaged > 0 ? "down" : "neutral"} icon={<Wrench size={18} />} />
      </div>

      {equipment.length === 0 ? (
        <EmptyState
          icon={<Package size={24} />}
          title="No equipment tracked"
          description="Add jerseys, balls, cones, protective gear, and other team equipment."
          action={<Button size="sm" icon={<Plus size={14} />}>Add equipment</Button>}
        />
      ) : (
        <>
          {Object.entries(byCategory).map(([category, items]) => (
            <Card key={category}>
              <CardHeader title={category.charAt(0).toUpperCase() + category.slice(1)} />
              <div className="space-y-2">
                {items.map((item) => {
                  const avail = Number(item.quantity_available ?? 0);
                  const total = Number(item.quantity_total ?? 0);
                  const pct = total > 0 ? Math.round((avail / total) * 100) : 0;
                  return (
                    <div key={String(item.id)} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-surface-1 transition-colors">
                      <div className="w-9 h-9 rounded-lg bg-sports-50 dark:bg-sports-950/30 flex items-center justify-center text-sports-600 flex-shrink-0">
                        <Package size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground">{String(item.item_name)}</p>
                        {item.storage_location && <p className="text-xs text-muted-foreground">📍 {String(item.storage_location)}</p>}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-bold">{avail}/{total}</p>
                          <p className="text-xs text-muted-foreground">available</p>
                        </div>
                        <Badge
                          label={avail === 0 ? "Out of stock" : avail < total * 0.25 ? "Low stock" : "In stock"}
                          color={avail === 0 ? "red" : avail < total * 0.25 ? "yellow" : "green"}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}

          {/* Current assignments */}
          {assignments.length > 0 && (
            <Card>
              <CardHeader title="Currently issued" description={`${assignments.length} items out`} />
              <div className="space-y-2">
                {assignments.slice(0, 10).map((a) => (
                  <div key={String(a.id)} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="text-sm font-medium">{String((a.sports_equipment as Record<string, unknown>)?.item_name ?? "—")}</p>
                      <p className="text-xs text-muted-foreground">{String((a.member_profiles as Record<string, unknown>)?.full_name ?? "—")}</p>
                    </div>
                    <div className="text-right">
                      <Badge label={String(a.condition ?? "good")} color={a.condition === "damaged" ? "red" : a.condition === "lost" ? "red" : "green"} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
