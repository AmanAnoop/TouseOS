"use client";

import { useState } from "react";
import Link from "next/link";
import { Building, ChevronRight, Users, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button, Card, Input } from "@/components/ui";

const ORG_TYPES = [
  { value: "fraternity", label: "Fraternity", description: "Greek-letter fraternity", icon: "🏛️" },
  { value: "sorority", label: "Sorority", description: "Greek-letter sorority", icon: "🌸" },
  { value: "club_sports", label: "Club Sports", description: "Club sports team (SportsOS)", icon: "🏆" },
  { value: "general_org", label: "Student Organization", description: "Clubs, societies & campus orgs (ClubOS)", icon: "🎓" },
];

interface OnboardingWizardProps {
  /** welcome = first-time flow; create = add another org */
  mode?: "welcome" | "create";
  allowBackToDashboard?: boolean;
}

export function OnboardingWizard({ mode = "welcome", allowBackToDashboard = false }: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(mode === "create" ? 2 : 1);
  const [orgType, setOrgType] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", campus: "", councilOrLeague: "", contactEmail: "",
  });

  async function createOrg() {
    if (!orgType || !form.name.trim()) {
      toast.error("Choose an organization type and enter a name");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/create-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          type: orgType,
          campus: form.campus || undefined,
          councilOrLeague: form.councilOrLeague || undefined,
          contactEmail: form.contactEmail || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to create organization");
        if (data.hint) console.warn(data.hint);
        return;
      }
      toast.success(`Created ${data.org?.name ?? "organization"}!`);
      if (data.org?.id) {
        document.cookie = `touse_active_org_id=${data.org.id}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      }
      const dest = data.redirectTo ?? "/dashboard";
      router.push(dest);
      router.refresh();
    } catch {
      toast.error("Network error — try again");
    } finally {
      setLoading(false);
    }
  }

  async function joinByCode() {
    if (!inviteCode.trim()) return;
    setLoading(true);
    const res = await fetch("/api/onboarding/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: inviteCode.trim() }),
    });
    setLoading(false);
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Invalid invite code");
      return;
    }
    toast.success(`Joined ${data.org?.name ?? "organization"}!`);
    router.push("/dashboard");
    router.refresh();
  }

  async function joinDemo() {
    setLoading(true);
    const res = await fetch("/api/onboarding/join-demo", { method: "POST" });
    setLoading(false);
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Demo not available");
      return;
    }
    toast.success(`Welcome to ${data.org?.name}!`);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-lg">
      {allowBackToDashboard && (
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block">
          ← Back to dashboard
        </Link>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold">Welcome to TouseOS</h1>
            <p className="text-muted-foreground mt-1">Create your chapter, join with a code, or explore the demo.</p>
          </div>
          <Card className="cursor-pointer hover:border-greek-400 transition-colors" onClick={() => setStep(2)}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-greek-50 flex items-center justify-center">
                <Building size={20} className="text-greek-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Create a new organization</p>
                <p className="text-sm text-muted-foreground">Set up your chapter or team workspace</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </div>
          </Card>
          <Card className="cursor-pointer hover:border-greek-400 transition-colors" onClick={() => setStep(4)}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Users size={20} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Join with invite code</p>
                <p className="text-sm text-muted-foreground">Enter the code from your officer</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </div>
          </Card>
          <Card className="cursor-pointer hover:border-amber-300 transition-colors" onClick={joinDemo}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <Zap size={20} className="text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Try demo chapter</p>
                <p className="text-sm text-muted-foreground">Explore TouseOS with sample data</p>
              </div>
              {loading && <span className="text-xs text-muted-foreground">Joining...</span>}
            </div>
          </Card>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">
            {mode === "create" ? "Add another organization" : "What type of organization?"}
          </h2>
          {mode === "create" && (
            <p className="text-sm text-muted-foreground">
              Each org is a separate workspace (Greek chapter, sports team, or student club).
            </p>
          )}
          <div className="space-y-2">
            {ORG_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => { setOrgType(type.value); setStep(3); }}
                className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-border hover:border-greek-300 text-left"
              >
                <span className="text-2xl">{type.icon}</span>
                <div>
                  <p className="font-semibold">{type.label}</p>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                </div>
              </button>
            ))}
          </div>
          {mode === "welcome" ? (
            <Button variant="secondary" onClick={() => setStep(1)} className="w-full">Back</Button>
          ) : (
            <Link href="/dashboard" className="block text-center text-sm text-muted-foreground hover:underline">
              Cancel
            </Link>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Set up your workspace</h2>
          <Input label="Organization name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Beta Theta Pi – Alpha Epsilon" />
          <Input label="Campus" value={form.campus} onChange={(e) => setForm({ ...form, campus: e.target.value })} />
          <Input label="Council / league" value={form.councilOrLeague} onChange={(e) => setForm({ ...form, councilOrLeague: e.target.value })} />
          <Input label="Contact email" type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep(2)} className="flex-1">Back</Button>
            <Button onClick={createOrg} loading={loading} disabled={!form.name.trim()} className="flex-1">
              Create
            </Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Join with invite code</h2>
          <Input label="Invite code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} placeholder="ABCD1234" />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">Back</Button>
            <Button onClick={joinByCode} loading={loading} className="flex-1">Join</Button>
          </div>
        </div>
      )}
    </div>
  );
}
