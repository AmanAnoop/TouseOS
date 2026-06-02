"use client";

import { useCallback, useEffect, useState } from "react";
import { Building, Phone, Plus, Star } from "lucide-react";
import toast from "react-hot-toast";
import {
  Badge, Button, Card, CardHeader, EmptyState, Input, Modal,
  PageHeader, Select, Textarea,
} from "@/components/ui";

const VENDOR_CATEGORIES = [
  "Venue", "DJ", "Caterer", "Security", "Bus company", "Photographer",
  "T-shirt vendor", "Hotel", "Rental van", "Uniform vendor",
  "Equipment vendor", "Field/court rental", "Repair contractor",
];

interface Vendor {
  id: string;
  name: string;
  category: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  reliability_rating: number | null;
  would_use_again: boolean | null;
  total_spent: number | null;
}

export function VendorsClient() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", category: "Venue", contactName: "", contactEmail: "",
    contactPhone: "", notes: "", reliabilityRating: "4", wouldUseAgain: true,
  });

  const load = useCallback(async (oid: string) => {
    const res = await fetch(`/api/vendors?org_id=${oid}`);
    if (res.ok) setVendors(await res.json());
  }, []);

  useEffect(() => {
    async function init() {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: m } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).limit(1).single();
      if (m) { setOrgId(m.org_id); load(m.org_id); }
    }
    init();
  }, [load]);

  async function addVendor() {
    if (!orgId || !form.name) return;
    const res = await fetch("/api/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        name: form.name,
        category: form.category,
        contactName: form.contactName,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        notes: form.notes,
        reliabilityRating: parseInt(form.reliabilityRating, 10),
        wouldUseAgain: form.wouldUseAgain,
      }),
    });
    if (res.ok) {
      toast.success("Vendor added");
      setOpen(false);
      setForm({ name: "", category: "Venue", contactName: "", contactEmail: "", contactPhone: "", notes: "", reliabilityRating: "4", wouldUseAgain: true });
      load(orgId);
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Failed");
    }
  }

  const byCategory = VENDOR_CATEGORIES.reduce<Record<string, Vendor[]>>((acc, cat) => {
    acc[cat] = vendors.filter((v) => v.category.toLowerCase() === cat.toLowerCase());
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <PageHeader
        title="Vendor Memory"
        description="Institutional knowledge of venues, DJs, caterers, and service providers"
        action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setOpen(true)}>Add vendor</Button>}
      />

      {vendors.length === 0 ? (
        <EmptyState
          icon={<Building size={24} />}
          title="No vendors yet"
          description="Add vendors so future officers never lose contact info."
          action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setOpen(true)}>Add first vendor</Button>}
        />
      ) : (
        VENDOR_CATEGORIES.filter((cat) => byCategory[cat]?.length > 0).map((category) => (
          <Card key={category}>
            <CardHeader title={category} />
            <div className="space-y-3">
              {byCategory[category].map((vendor) => (
                <div key={vendor.id} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                  <Building size={16} className="text-greek-600 mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{vendor.name}</p>
                      {vendor.would_use_again && <Badge label="Would use again" color="green" />}
                      {vendor.reliability_rating != null && vendor.reliability_rating > 0 && (
                        <span className="flex">
                          {Array.from({ length: Math.min(5, vendor.reliability_rating) }).map((_, i) => (
                            <Star key={i} size={10} className="text-yellow-400 fill-yellow-400" />
                          ))}
                        </span>
                      )}
                    </div>
                    {vendor.contact_name && <p className="text-xs text-muted-foreground">Contact: {vendor.contact_name}</p>}
                    {vendor.notes && <p className="text-xs text-muted-foreground italic mt-1">{vendor.notes}</p>}
                  </div>
                  {vendor.contact_phone && (
                    <a href={`tel:${vendor.contact_phone}`} className="p-2 text-muted-foreground hover:text-greek-600">
                      <Phone size={14} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add vendor" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={addVendor}>Save</Button></>}>
        <div className="space-y-3">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={VENDOR_CATEGORIES.map((c) => ({ value: c, label: c }))} />
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Contact name" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
            <Input label="Phone" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
          </div>
          <Input label="Email" type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
        </div>
      </Modal>
    </div>
  );
}
