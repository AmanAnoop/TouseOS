"use client";

import { useCallback, useEffect, useState } from "react";
import { Package, Plus, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import {
  Badge, Button, Card, CardHeader, EmptyState, Input, Modal,
  PageHeader, Select, StatCard,
} from "@/components/ui";
import { useOrg } from "@/hooks/use-org";

interface EquipmentItem {
  id: string;
  item_name: string;
  category: string;
  quantity_total: number;
  quantity_available: number;
  storage_location: string | null;
}

interface Assignment {
  id: string;
  condition: string;
  member_profiles: { full_name: string } | null;
  sports_equipment: { item_name: string } | null;
}

export function EquipmentClient() {
  const { orgId } = useOrg();
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [members, setMembers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [itemForm, setItemForm] = useState({ itemName: "", category: "equipment", quantityTotal: "1", storageLocation: "" });
  const [issueForm, setIssueForm] = useState({ equipmentId: "", memberId: "" });

  const load = useCallback(async (oid: string) => {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { data: items } = await supabase.from("sports_equipment").select("*").eq("org_id", oid).order("item_name");
    setEquipment((items ?? []) as EquipmentItem[]);

    const ids = (items ?? []).map((i: EquipmentItem) => i.id);
    if (ids.length > 0) {
      const { data: assigns } = await supabase
        .from("sports_equipment_assignments")
        .select("*, member_profiles(full_name), sports_equipment(item_name)")
        .in("equipment_id", ids)
        .is("returned_at", null);
      setAssignments((assigns ?? []) as Assignment[]);
    } else {
      setAssignments([]);
    }

    const { data: mems } = await supabase.from("member_profiles").select("id, full_name").eq("org_id", oid).eq("membership_status", "active");
    setMembers((mems ?? []) as Array<{ id: string; full_name: string }>);
  }, []);

  useEffect(() => {
    if (orgId) load(orgId);
  }, [orgId, load]);

  async function addItem() {
    if (!orgId || !itemForm.itemName) return;
    const res = await fetch("/api/equipment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, action: "add_item", ...itemForm, quantityTotal: itemForm.quantityTotal }),
    });
    if (res.ok) {
      toast.success("Equipment added");
      setAddOpen(false);
      load(orgId);
    } else toast.error("Failed to add");
  }

  async function issueItem() {
    if (!orgId || !issueForm.equipmentId || !issueForm.memberId) return;
    const res = await fetch("/api/equipment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, action: "issue", ...issueForm }),
    });
    if (res.ok) {
      toast.success("Issued");
      setIssueOpen(false);
      load(orgId);
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Failed");
    }
  }

  async function returnItem(assignmentId: string) {
    if (!orgId) return;
    const res = await fetch("/api/equipment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, action: "return", assignmentId }),
    });
    if (res.ok) {
      toast.success("Returned");
      load(orgId);
    }
  }

  const totalItems = equipment.reduce((s, e) => s + Number(e.quantity_total), 0);
  const available = equipment.reduce((s, e) => s + Number(e.quantity_available), 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Equipment & Uniforms"
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setIssueOpen(true)}>Issue item</Button>
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setAddOpen(true)}>Add item</Button>
          </div>
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total" value={totalItems} icon={<Package size={18} />} />
        <StatCard title="Available" value={available} icon={<Package size={18} />} />
        <StatCard title="Issued" value={totalItems - available} icon={<RotateCcw size={18} />} />
        <StatCard title="SKUs" value={equipment.length} icon={<Package size={18} />} />
      </div>

      {equipment.length === 0 ? (
        <EmptyState icon={<Package size={24} />} title="No equipment" action={<Button size="sm" onClick={() => setAddOpen(true)}>Add item</Button>} />
      ) : (
        <Card>
          <CardHeader title="Inventory" />
          <div className="space-y-2">
            {equipment.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <p className="font-medium text-sm">{item.item_name}</p>
                  <p className="text-xs text-muted-foreground">{item.category}</p>
                </div>
                <Badge label={`${item.quantity_available}/${item.quantity_total}`} color={item.quantity_available === 0 ? "red" : "green"} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {assignments.length > 0 && (
        <Card>
          <CardHeader title="Currently issued" />
          <div className="space-y-2">
            {assignments.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <p className="text-sm font-medium">{a.sports_equipment?.item_name}</p>
                  <p className="text-xs text-muted-foreground">{a.member_profiles?.full_name}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => returnItem(a.id)}>Return</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add equipment" footer={<><Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button><Button onClick={addItem}>Save</Button></>}>
        <div className="space-y-3">
          <Input label="Item name" value={itemForm.itemName} onChange={(e) => setItemForm({ ...itemForm, itemName: e.target.value })} />
          <Input label="Category" value={itemForm.category} onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })} />
          <Input label="Quantity" type="number" value={itemForm.quantityTotal} onChange={(e) => setItemForm({ ...itemForm, quantityTotal: e.target.value })} />
          <Input label="Storage" value={itemForm.storageLocation} onChange={(e) => setItemForm({ ...itemForm, storageLocation: e.target.value })} />
        </div>
      </Modal>

      <Modal open={issueOpen} onClose={() => setIssueOpen(false)} title="Issue equipment" footer={<><Button variant="secondary" onClick={() => setIssueOpen(false)}>Cancel</Button><Button onClick={issueItem}>Issue</Button></>}>
        <div className="space-y-3">
          <Select label="Item" value={issueForm.equipmentId} onChange={(e) => setIssueForm({ ...issueForm, equipmentId: e.target.value })} options={[{ value: "", label: "Select" }, ...equipment.filter((e) => e.quantity_available > 0).map((e) => ({ value: e.id, label: e.item_name }))]} />
          <Select label="Member" value={issueForm.memberId} onChange={(e) => setIssueForm({ ...issueForm, memberId: e.target.value })} options={[{ value: "", label: "Select" }, ...members.map((m) => ({ value: m.id, label: m.full_name }))]} />
        </div>
      </Modal>
    </div>
  );
}
