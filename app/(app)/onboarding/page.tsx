"use client";

import { useState } from "react";
import { Building, ChevronRight, Users } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const ORG_TYPES = [
  { value: "fraternity", label: "Fraternity", description: "Greek-letter fraternity", icon: "🏛️" },
  { value: "sorority", label: "Sorority", description: "Greek-letter sorority", icon: "🌸" },
  { value: "club_sports", label: "Club Sports", description: "Club sports team (SportsOS)", icon: "🏆" },
  { value: "general_org", label: "Student Organization", description: "General campus org", icon: "🎓" },
  { value: "university", label: "University/Admin", description: "University administration", icon: "🏫" },
];

export default function OnboardingPage() {
  const supabase = createClient();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [orgType, setOrgType] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", campus: "", councilOrLeague: "", contactEmail: "" });

  async function createOrg() {
    if (!orgType || !form.name) return;
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: org, error } = await supabase.from("organizations").insert({
      name: form.name,
      type: orgType,
      campus: form.campus || null,
      council_or_league: form.councilOrLeague || null,
      contact_email: form.contactEmail || null,
    }).select().single();

    if (error || !org) { toast.error(error?.message ?? "Failed to create organization"); setCreating(false); return; }

    await supabase.from("org_members").insert({
      org_id: org.id,
      user_id: user.id,
      role: "owner",
      status: "active",
    });

    toast.success(`${form.name} created!`);
    router.push("/dashboard");
  }

  async function joinByCode() {
    if (!inviteCode) return;
    const { data: org } = await supabase.from("organizations").select("id, name").eq("invite_code", inviteCode.toUpperCase()).single();
    if (!org) { toast.error("Invalid invite code"); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("org_members").upsert({
      org_id: org.id,
      user_id: user.id,
      role: "general_member",
      status: "pending_invite",
    }, { onConflict: "org_id,user_id" });

    toast.success(`Requested to join ${org.name}`);
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-greek-600 flex items-center justify-center text-white font-bold text-sm">TO</div>
          <span className="text-xl font-bold">TouseOS</span>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold">Welcome to TouseOS</h1>
              <p className="text-muted-foreground mt-1">Get started by creating your organization or joining an existing one.</p>
            </div>
            <Card className="cursor-pointer hover:border-greek-400 transition-colors" onClick={() => setStep(2)}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-greek-50 dark:bg-greek-950/30 flex items-center justify-center"><Building size={20} className="text-greek-600" /></div>
                <div className="flex-1">
                  <p className="font-semibold">Create a new organization</p>
                  <p className="text-sm text-muted-foreground">Set up your chapter or team workspace</p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </div>
            </Card>
            <Card className="cursor-pointer hover:border-greek-400 transition-colors" onClick={() => setStep(4)}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center"><Users size={20} className="text-blue-600" /></div>
                <div className="flex-1">
                  <p className="font-semibold">Join with invite code</p>
                  <p className="text-sm text-muted-foreground">Enter the 8-character code from your officer</p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </div>
            </Card>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold">What type of organization?</h2>
              <p className="text-muted-foreground mt-1">This selects the right features for your workspace.</p>
            </div>
            <div className="space-y-2">
              {ORG_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => { setOrgType(type.value); setStep(3); }}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-colors text-left ${orgType === type.value ? "border-greek-500 bg-greek-50 dark:bg-greek-950/30" : "border-border hover:border-greek-300"}`}
                >
                  <span className="text-2xl">{type.icon}</span>
                  <div>
                    <p className="font-semibold">{type.label}</p>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </div>
                </button>
              ))}
            </div>
            <Button variant="secondary" onClick={() => setStep(1)} className="w-full">Back</Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold">Set up your workspace</h2>
              <p className="text-muted-foreground mt-1">You can update these details later in Settings.</p>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Organization name <span className="text-red-500">*</span></label>
                <input className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. Beta Theta Pi – Alpha Epsilon" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Campus/University</label>
                <input className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. University of Texas" value={form.campus} onChange={(e) => setForm({ ...form, campus: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Council or League</label>
                <input className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. IFC, Panhellenic, Campus Rec" value={form.councilOrLeague} onChange={(e) => setForm({ ...form, councilOrLeague: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Contact email</label>
                <input type="email" className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="chapter@university.edu" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(2)} className="flex-1">Back</Button>
              <Button onClick={createOrg} loading={creating} disabled={!form.name} className="flex-1">Create workspace</Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold">Join with invite code</h2>
              <p className="text-muted-foreground mt-1">Ask your president or treasurer for the 8-character invite code.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Invite code</label>
              <input className="h-12 w-full rounded-lg border border-border bg-background px-4 text-center text-xl font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-ring" placeholder="XXXXXXXX" maxLength={8} value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} />
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">Back</Button>
              <Button onClick={joinByCode} disabled={inviteCode.length < 8} className="flex-1">Join organization</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
