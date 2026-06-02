"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building, ChevronRight, Copy, FlaskConical, Users, CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import { Alert, Button, Card, Input, PageHeader } from "@/components/ui";

const ORG_TYPES = [
  { value: "fraternity", label: "Fraternity", description: "Greek-letter fraternity", icon: "🏛️" },
  { value: "sorority", label: "Sorority", description: "Greek-letter sorority", icon: "🌸" },
  { value: "club_sports", label: "Club Sports", description: "Club sports team (SportsOS)", icon: "🏆" },
  { value: "general_org", label: "Student Organization", description: "General campus org", icon: "🎓" },
  { value: "university", label: "University / Admin", description: "University administration", icon: "🏫" },
] as const;

type Step = "home" | "type" | "details" | "join" | "success";

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("home");
  const [orgType, setOrgType] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdOrg, setCreatedOrg] = useState<{
    name: string;
    inviteCode: string;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    campus: "",
    councilOrLeague: "",
    contactEmail: "",
  });

  async function createOrg() {
    setSubmitError(null);
    if (!orgType) {
      setSubmitError("Choose an organization type first (use Back).");
      return;
    }
    if (!form.name.trim()) {
      setSubmitError("Organization name is required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/create-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, type: orgType }),
      });
      let data: { error?: string; org?: { name: string; inviteCode?: string } } = {};
      try {
        data = await res.json();
      } catch {
        setSubmitError("Server error — check the terminal and Supabase setup.");
        return;
      }
      if (!res.ok) {
        const msg = data.error ?? "Could not create organization";
        setSubmitError(msg);
        toast.error(msg);
        return;
      }
      if (!data.org?.name) {
        setSubmitError("Unexpected response from server.");
        return;
      }
      setCreatedOrg({
        name: data.org.name,
        inviteCode: data.org.inviteCode ?? "",
      });
      setStep("success");
      toast.success("Workspace created! Redirecting…");
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 2000);
    } catch {
      setSubmitError("Network error — try again");
      toast.error("Network error — try again");
    } finally {
      setLoading(false);
    }
  }

  async function joinByCode() {
    if (inviteCode.length < 6) return;
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not join");
        return;
      }
      toast.success(data.message ?? "Request submitted");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Network error — try again");
    } finally {
      setLoading(false);
    }
  }

  async function joinDemo() {
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/join-demo", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Demo not available");
        return;
      }
      toast.success(data.message ?? "Joined demo chapter");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Network error — try again");
    } finally {
      setLoading(false);
    }
  }

  function copyInvite() {
    if (!createdOrg?.inviteCode) return;
    navigator.clipboard.writeText(createdOrg.inviteCode);
    toast.success("Invite code copied");
  }

  const stepLabels: Record<Step, number> = {
    home: 1,
    type: 2,
    details: 3,
    join: 2,
    success: 4,
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-greek-600 flex items-center justify-center text-white font-bold text-sm">
            TO
          </div>
          <span className="text-xl font-bold text-foreground">TouseOS</span>
        </div>

        {step !== "home" && step !== "success" && (
          <div className="flex gap-2">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`h-1 flex-1 rounded-full ${stepLabels[step] >= n ? "bg-greek-600" : "bg-border"}`}
              />
            ))}
          </div>
        )}

        {step === "home" && (
          <>
            <PageHeader
              title="Set up your workspace"
              description="Create a new chapter or team, join with an invite code, or explore demo data."
            />
            <div className="space-y-3">
              <Card
                className="cursor-pointer hover:border-racing-400 transition-colors"
                onClick={() => setStep("type")}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-racing-50 flex items-center justify-center">
                    <Building size={20} className="text-racing" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Create organization</p>
                    <p className="text-sm text-muted-foreground">You&apos;re the first admin</p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </div>
              </Card>
              <Card
                className="cursor-pointer hover:border-racing-400 transition-colors"
                onClick={() => setStep("join")}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Users size={20} className="text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Join with invite code</p>
                    <p className="text-sm text-muted-foreground">From your president or treasurer</p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </div>
              </Card>
              <Card
                className="cursor-pointer hover:border-amber-400 transition-colors border-dashed"
                onClick={joinDemo}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
                    <FlaskConical size={20} className="text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Try demo chapter</p>
                    <p className="text-sm text-muted-foreground">Beta Theta Pi sample data (requires seed migration)</p>
                  </div>
                  {loading ? (
                    <span className="text-xs text-muted-foreground">Loading…</span>
                  ) : (
                    <ChevronRight size={16} className="text-muted-foreground" />
                  )}
                </div>
              </Card>
            </div>
          </>
        )}

        {step === "type" && (
          <div className="space-y-4">
            <PageHeader
              title="Organization type"
              description="We enable the right modules (GreekMatch, SportsOS, ExecLink, etc.)."
            />
            <div className="space-y-2">
              {ORG_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => {
                    setOrgType(type.value);
                    setStep("details");
                  }}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-border hover:border-racing-300 transition-colors text-left"
                >
                  <span className="text-2xl">{type.icon}</span>
                  <div>
                    <p className="font-semibold">{type.label}</p>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </div>
                </button>
              ))}
            </div>
            <Button variant="secondary" className="w-full" onClick={() => setStep("home")}>
              Back
            </Button>
          </div>
        )}

        {step === "details" && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void createOrg();
            }}
          >
            <PageHeader
              title="Workspace details"
              description="You can change these anytime in Settings."
            />
            <div className="space-y-3">
              <Input
                label="Organization name"
                placeholder="Beta Theta Pi – Alpha Epsilon"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
                label="Campus / university"
                placeholder="State University"
                value={form.campus}
                onChange={(e) => setForm({ ...form, campus: e.target.value })}
              />
              <Input
                label="Council or league"
                placeholder="IFC, Panhellenic, Campus Rec"
                value={form.councilOrLeague}
                onChange={(e) => setForm({ ...form, councilOrLeague: e.target.value })}
              />
              <Input
                label="Contact email"
                type="email"
                placeholder="chapter@university.edu"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              />
            </div>
            {submitError && (
              <Alert type="error" title="Could not create workspace" description={submitError} />
            )}
            <div className="flex gap-3">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setStep("type")}>
                Back
              </Button>
              <Button
                type="submit"
                className="flex-1"
                loading={loading}
                disabled={!form.name.trim() || loading}
              >
                Create workspace
              </Button>
            </div>
          </form>
        )}

        {step === "join" && (
          <div className="space-y-4">
            <PageHeader
              title="Join your chapter"
              description="Enter the 8-character code from an officer. They'll approve your request."
            />
            <Input
              label="Invite code"
              placeholder="DEMO2025"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
              className="font-mono tracking-widest uppercase"
            />
            <Alert
              type="info"
              title="Pending approval"
              description="After joining, an officer can approve you under Settings → Members."
            />
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setStep("home")}>
                Back
              </Button>
              <Button
                className="flex-1"
                loading={loading}
                disabled={inviteCode.length < 6}
                onClick={joinByCode}
              >
                Request to join
              </Button>
            </div>
          </div>
        )}

        {step === "success" && createdOrg && (
          <div className="space-y-4">
            <div className="flex flex-col items-center text-center py-4">
              <CheckCircle2 size={48} className="text-racing mb-3" />
              <h2 className="text-xl font-bold">{createdOrg.name} is ready</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Share this invite code so members can join.
              </p>
            </div>
            <Card className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Invite code</p>
              <p className="text-3xl font-mono font-bold tracking-widest text-racing-700">
                {createdOrg.inviteCode}
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                icon={<Copy size={14} />}
                onClick={copyInvite}
              >
                Copy code
              </Button>
            </Card>
            <Button className="w-full" onClick={() => { router.push("/dashboard"); router.refresh(); }}>
              Continue to dashboard
            </Button>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          <Link href="/account" className="hover:underline">Account</Link>
          {" · "}
          <button type="button" className="hover:underline" onClick={async () => {
            const { createClient } = await import("@/lib/supabase/client");
            await createClient().auth.signOut();
            router.push("/login");
          }}
          >
            Sign out
          </button>
        </p>
      </div>
    </div>
  );
}
