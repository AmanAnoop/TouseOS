"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Download, Mail, MapPin, Plus, Briefcase,
  GraduationCap, Heart, Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  Avatar, Badge, Button, Card, CardHeader, EmptyState,
  Modal, Input, PageHeader, SearchInput, StatCard, Tabs,
} from "@/components/ui";
import { downloadCsv } from "@/lib/utils";
import type { AlumniProfile } from "@/types";
import toast from "react-hot-toast";
import { AlumniCampaignsPanel } from "@/components/alumni/alumni-campaigns-panel";

export default function AlumniPage() {
  const supabase = createClient();
  const [alumni, setAlumni] = useState<AlumniProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("directory");
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<AlumniProfile | null>(null);

  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", graduationYear: "",
    pledgeClass: "", city: "", state: "", careerField: "",
    employer: "", mentorshipInterest: false, contactPreference: "email",
  });

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const { data } = await supabase.from("alumni_profiles").select("*").eq("org_id", oid).order("full_name");
    setAlumni((data ?? []) as AlumniProfile[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: m } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).limit(1).single();
      if (m) { setOrgId(m.org_id); load(m.org_id); }
    }
    init();
  }, [supabase, load]);

  async function addAlumni() {
    if (!orgId || !form.fullName) return;
    const { error } = await supabase.from("alumni_profiles").insert({
      org_id: orgId,
      full_name: form.fullName,
      email: form.email || null,
      phone: form.phone || null,
      graduation_year: form.graduationYear ? parseInt(form.graduationYear) : null,
      pledge_class: form.pledgeClass || null,
      city: form.city || null,
      state: form.state || null,
      career_field: form.careerField || null,
      employer: form.employer || null,
      mentorship_interest: form.mentorshipInterest,
      contact_preference: form.contactPreference,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Alumni added");
    setAddOpen(false);
    setForm({ fullName: "", email: "", phone: "", graduationYear: "", pledgeClass: "", city: "", state: "", careerField: "", employer: "", mentorshipInterest: false, contactPreference: "email" });
    load(orgId);
  }

  const filtered = alumni.filter((a) => {
    const q = query.toLowerCase();
    return !q || a.full_name.toLowerCase().includes(q) ||
      (a.employer ?? "").toLowerCase().includes(q) ||
      (a.career_field ?? "").toLowerCase().includes(q) ||
      (a.city ?? "").toLowerCase().includes(q);
  });

  const mentors = alumni.filter((a) => a.mentorship_interest);
  const totalGiving = alumni.reduce((s, a) => s + Number(a.giving_history ?? 0), 0);
  const topClasses = [...new Set(alumni.map((a) => a.graduation_year).filter(Boolean))].sort((a, b) => (b ?? 0) - (a ?? 0)).slice(0, 5);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Alumni / Alumnae CRM"
        description={`${alumni.length} alumni in database · ${mentors.length} mentorship volunteers`}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={() => downloadCsv("alumni.csv", alumni.map((a) => ({ Name: a.full_name, Email: a.email ?? "", "Grad Year": a.graduation_year ?? "", City: a.city ?? "", "Career Field": a.career_field ?? "", Employer: a.employer ?? "" })))}>Export</Button>
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setAddOpen(true)}>Add alumni</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total alumni" value={alumni.length} icon={<GraduationCap size={18} />} />
        <StatCard title="Mentors available" value={mentors.length} deltaType="up" icon={<Heart size={18} />} />
        <StatCard title="Total giving" value={totalGiving > 0 ? `$${totalGiving.toLocaleString()}` : "—"} icon={<Users size={18} />} />
        <StatCard title="Graduation classes" value={topClasses.length} icon={<GraduationCap size={18} />} />
      </div>

      <Tabs
        tabs={[
          { id: "directory", label: "Directory", count: alumni.length },
          { id: "mentors", label: "Mentors", count: mentors.length },
          { id: "campaigns", label: "Campaigns" },
          { id: "careers", label: "Careers" },
        ]}
        active={tab}
        onChange={setTab}
      />

      <SearchInput value={query} onChange={setQuery} placeholder="Search by name, employer, city, career..." />

      {tab === "campaigns" && orgId ? (
        <AlumniCampaignsPanel orgId={orgId} />
      ) : loading ? (
        <div className="grid sm:grid-cols-2 gap-3">{[1,2,3,4].map((i) => <Card key={i} className="h-20 animate-pulse bg-surface-2 border-0">&nbsp;</Card>)}</div>
      ) : (tab === "mentors" ? filtered.filter((a) => a.mentorship_interest) : filtered).length === 0 ? (
        <EmptyState
          icon={<GraduationCap size={24} />}
          title={tab === "mentors" ? "No mentors available" : "No alumni found"}
          description="Add alumni to build your chapter's network."
          action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setAddOpen(true)}>Add alumni</Button>}
        />
      ) : (
        tab === "careers" ? (
          <Card>
            <CardHeader title="Career breakdown" description="Industries where your alumni work" />
            <div className="space-y-3">
              {Object.entries(
                (tab === "careers" ? filtered : filtered).reduce<Record<string, number>>((acc, a) => {
                  if (a.career_field) acc[a.career_field] = (acc[a.career_field] ?? 0) + 1;
                  return acc;
                }, {})
              ).sort(([,a], [,b]) => b - a).slice(0, 10).map(([field, count]) => (
                <div key={field} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-40 truncate flex-shrink-0">{field}</span>
                  <div className="flex-1 h-2 rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-greek-500" style={{ width: `${(count / alumni.length) * 100}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-6 text-right">{count}</span>
                </div>
              ))}
              {Object.entries(alumni.reduce<Record<string, number>>((acc, a) => {
                if (a.career_field) acc[a.career_field] = (acc[a.career_field] ?? 0) + 1;
                return acc;
              }, {})).length === 0 && (
                <p className="text-sm text-muted-foreground">No career data yet. Add alumni with career info.</p>
              )}
            </div>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {(tab === "mentors" ? filtered.filter((a) => a.mentorship_interest) : filtered).map((alumnus) => (
              <Card
                key={alumnus.id}
                padding="sm"
                className="cursor-pointer hover:border-greek-300 transition-colors"
                onClick={() => setSelected(alumnus)}
              >
                <div className="flex items-start gap-3">
                  <Avatar name={alumnus.full_name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-foreground">{alumnus.full_name}</p>
                      {alumnus.graduation_year && (
                        <Badge label={`'${String(alumnus.graduation_year).slice(-2)}`} color="blue" />
                      )}
                      {alumnus.mentorship_interest && <Badge label="Mentor" color="green" />}
                    </div>
                    {alumnus.employer && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Briefcase size={11} />
                        <span className="truncate">{alumnus.employer}</span>
                      </div>
                    )}
                    {alumnus.career_field && (
                      <p className="text-xs text-muted-foreground">{alumnus.career_field}</p>
                    )}
                    {(alumnus.city || alumnus.state) && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin size={11} />
                        {[alumnus.city, alumnus.state].filter(Boolean).join(", ")}
                      </div>
                    )}
                  </div>
                  {alumnus.email && (
                    <a href={`mailto:${alumnus.email}`} onClick={(e) => e.stopPropagation()} className="text-muted-foreground hover:text-greek-600">
                      <Mail size={14} />
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Alumni detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.full_name ?? ""} size="md"
        footer={<Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>}
      >
        {selected && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Graduation year", value: selected.graduation_year ? `Class of '${String(selected.graduation_year).slice(-2)}` : "—" },
                { label: "Pledge class", value: selected.pledge_class ?? "—" },
                { label: "Location", value: [selected.city, selected.state].filter(Boolean).join(", ") || "—" },
                { label: "Career field", value: selected.career_field ?? "—" },
                { label: "Employer", value: selected.employer ?? "—" },
                { label: "Contact pref.", value: selected.contact_preference ?? "Email" },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-lg bg-surface-1">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-medium">{item.value}</p>
                </div>
              ))}
            </div>
            {selected.mentorship_interest && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 text-sm">
                <Heart size={14} />
                Interested in mentoring current members
              </div>
            )}
            {selected.email && (
              <a href={`mailto:${selected.email}`} className="flex items-center gap-2 text-sm text-greek-600 hover:underline">
                <Mail size={14} />{selected.email}
              </a>
            )}
          </div>
        )}
      </Modal>

      {/* Add modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add alumni" size="lg"
        footer={<><Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button><Button onClick={addAlumni} disabled={!form.fullName}>Add</Button></>}
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Full name *" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Graduation year" type="number" placeholder="2022" value={form.graduationYear} onChange={(e) => setForm({ ...form, graduationYear: e.target.value })} />
          <Input label="Pledge class" placeholder="Fall 2018, Spring 2019..." value={form.pledgeClass} onChange={(e) => setForm({ ...form, pledgeClass: e.target.value })} />
          <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <Input label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          <Input label="Career field" placeholder="Finance, Medicine, Tech..." value={form.careerField} onChange={(e) => setForm({ ...form, careerField: e.target.value })} />
          <Input label="Employer" className="sm:col-span-2" value={form.employer} onChange={(e) => setForm({ ...form, employer: e.target.value })} />
          <label className="sm:col-span-2 flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="rounded" checked={form.mentorshipInterest} onChange={(e) => setForm({ ...form, mentorshipInterest: e.target.checked })} />
            <div><p className="text-sm font-medium">Available for mentorship</p><p className="text-xs text-muted-foreground">Can be connected with current members</p></div>
          </label>
        </div>
      </Modal>
    </div>
  );
}
