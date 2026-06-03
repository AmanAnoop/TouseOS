"use client";

import { useCallback, useEffect, useState } from "react";
import { Package, Plus, RotateCcw, Users } from "lucide-react";
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
  equipment_id: string;
  condition: string;
  member_id: string;
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
  const [bulkOpen, setBulkOpen] = useState(false);
  const [itemForm, setItemForm] = useState({ itemName: "", category: "equipment", quantityTotal: "1", storageLocation: "" });
  const [issueForm, setIssueForm] = useState({ equipmentId: "", memberId: "" });
  const [bulkForm, setBulkForm] = useState({ equipmentId: "", jerseyNumber: "", uniformSize: "" });
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [issuing, setIssuing] = useState(false);

  const load = useCallback(async (oid: string) => {
    const res = await fetch(`/api/equipment?org_id=${encodeURIComponent(oid)}`);
    if (!res.ok) {
      toast.error("Failed to load equipment");
      return;
    }
    const data = await res.json();
    setEquipment((data.equipment ?? []) as EquipmentItem[]);
    setAssignments((data.assignments ?? []) as Assignment[]);
    setMembers((data.members ?? []) as Array<{ id: string; full_name: string }>);
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

  async function issueBulk() {
    if (!orgId || !bulkForm.equipmentId || selectedMemberIds.length === 0) return;
    setIssuing(true);
    const res = await fetch("/api/equipment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        action: "issue_bulk",
        equipmentId: bulkForm.equipmentId,
        memberIds: selectedMemberIds,
        jerseyNumber: bulkForm.jerseyNumber || undefined,
        uniformSize: bulkForm.uniformSize || undefined,
      }),
    });
    setIssuing(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error ?? "Bulk issue failed");
      return;
    }
    toast.success(`Issued ${data.issued} to ${data.itemName ?? "team"}${data.skipped ? ` (${data.skipped} not enough stock)` : ""}`);
    if (data.errors?.length) toast.error(data.errors.join("; "));
    setBulkOpen(false);
    setSelectedMemberIds([]);
    load(orgId);
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

  async function returnAllForItem(equipmentId: string) {
    if (!orgId) return;
    const ids = assignments.filter((a) => a.equipment_id === equipmentId).map((a) => a.id);
    if (!ids.length) return;
    const res = await fetch("/api/equipment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, action: "return_bulk", assignmentIds: ids }),
    });
    if (res.ok) {
      toast.success(`Returned ${(await res.json()).returned} items`);
      load(orgId);
    }
  }

  function toggleMember(id: string) {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  const selectedEquip = equipment.find((e) => e.id === bulkForm.equipmentId);
  const maxBulk = selectedEquip ? Math.min(selectedMemberIds.length, selectedEquip.quantity_available) : 0;

  const totalItems = equipment.reduce((s, e) => s + Number(e.quantity_total), 0);
  const available = equipment.reduce((s, e) => s + Number(e.quantity_available), 0);

  const membersWithoutItem = (equipId: string) => {
    const issuedIds = new Set(
      assignments.filter((a) => a.equipment_id === equipId).map((a) => a.member_id),
    );
    return members.filter((m) => !issuedIds.has(m.id));
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Equipment & Uniforms"
        description="Issue gear to one player or bulk-issue to the whole roster"
        action={
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="secondary" onClick={() => { setBulkOpen(true); setSelectedMemberIds([]); }} icon={<Users size={14} />}>
              Issue to team
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setIssueOpen(true)}>Issue one</Button>
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
            {equipment.map((item) => {
              const issuedCount = Number(item.quantity_total) - Number(item.quantity_available);
              return (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-border flex-wrap gap-2">
                <div>
                  <p className="font-medium text-sm">{item.item_name}</p>
                  <p className="text-xs text-muted-foreground">{item.category}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge label={`${item.quantity_available}/${item.quantity_total} free`} color={item.quantity_available === 0 ? "red" : "green"} />
                  {issuedCount > 0 && (
                    <Button size="sm" variant="secondary" onClick={() => returnAllForItem(item.id)}>Return all</Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={item.quantity_available === 0}
                    onClick={() => {
                      setBulkForm({ equipmentId: item.id, jerseyNumber: "", uniformSize: "" });
                      setSelectedMemberIds(membersWithoutItem(item.id).map((m) => m.id));
                      setBulkOpen(true);
                    }}
                  >
                    Quick issue
                  </Button>
                </div>
              </div>
            );
            })}
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

      <Modal open={issueOpen} onClose={() => setIssueOpen(false)} title="Issue to one member" footer={<><Button variant="secondary" onClick={() => setIssueOpen(false)}>Cancel</Button><Button onClick={issueItem}>Issue</Button></>}>
        <div className="space-y-3">
          <Select label="Item" value={issueForm.equipmentId} onChange={(e) => setIssueForm({ ...issueForm, equipmentId: e.target.value })} options={[{ value: "", label: "Select" }, ...equipment.filter((e) => e.quantity_available > 0).map((e) => ({ value: e.id, label: e.item_name }))]} />
          <Select label="Member" value={issueForm.memberId} onChange={(e) => setIssueForm({ ...issueForm, memberId: e.target.value })} options={[{ value: "", label: "Select" }, ...members.map((m) => ({ value: m.id, label: m.full_name }))]} />
        </div>
      </Modal>

      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title="Issue to multiple members" footer={
        <>
          <Button variant="secondary" onClick={() => setBulkOpen(false)}>Cancel</Button>
          <Button onClick={issueBulk} loading={issuing} disabled={!bulkForm.equipmentId || selectedMemberIds.length === 0}>
            Issue {maxBulk || selectedMemberIds.length}
          </Button>
        </>
      }>
        <div className="space-y-3">
          <Select
            label="Item"
            value={bulkForm.equipmentId}
            onChange={(e) => {
              setBulkForm({ ...bulkForm, equipmentId: e.target.value });
              setSelectedMemberIds(membersWithoutItem(e.target.value).map((m) => m.id));
            }}
            options={[{ value: "", label: "Select" }, ...equipment.filter((e) => e.quantity_available > 0).map((e) => ({
              value: e.id,
              label: `${e.item_name} (${e.quantity_available} available)`,
            }))]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Jersey # (optional)" value={bulkForm.jerseyNumber} onChange={(e) => setBulkForm({ ...bulkForm, jerseyNumber: e.target.value })} />
            <Input label="Size (optional)" value={bulkForm.uniformSize} onChange={(e) => setBulkForm({ ...bulkForm, uniformSize: e.target.value })} placeholder="M, L, XL" />
          </div>
          {selectedEquip && (
            <p className="text-xs text-muted-foreground">
              Will issue to up to {Math.min(selectedMemberIds.length, selectedEquip.quantity_available)} of {selectedMemberIds.length} selected ({selectedEquip.quantity_available} in stock)
            </p>
          )}
          <div className="flex gap-2">
            <button type="button" className="text-xs text-greek-600" onClick={() => setSelectedMemberIds(members.map((m) => m.id))}>Select all roster</button>
            <button type="button" className="text-xs text-muted-foreground" onClick={() => bulkForm.equipmentId && setSelectedMemberIds(membersWithoutItem(bulkForm.equipmentId).map((m) => m.id))}>Only without item</button>
            <button type="button" className="text-xs text-muted-foreground" onClick={() => setSelectedMemberIds([])}>Clear</button>
          </div>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
            {members.map((m) => (
              <label key={m.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-surface-1">
                <input type="checkbox" checked={selectedMemberIds.includes(m.id)} onChange={() => toggleMember(m.id)} />
                {m.full_name}
              </label>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
