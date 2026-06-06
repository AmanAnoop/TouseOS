"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Building2, ChevronRight, GraduationCap, Trophy, Users, UsersRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button, Input } from "@/components/ui";
import { ChapterIdentityPicker, type ChapterIdentityValue } from "@/components/settings/chapter-identity-picker";
import { AcademicProfileFields } from "@/components/profile/academic-profile-fields";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { REGAL_PRIMARY, REGAL_SECONDARY } from "@/lib/regal-theme";
import { getProductId } from "@/lib/org-product";

const ORG_TYPES = [
  {
    value: "fraternity",
    label: "Fraternity / Men's Spirit Org",
    description: "Greek-letter fraternity or men's spirit organization",
    Icon: Building2,
  },
  {
    value: "sorority",
    label: "Sorority / Women's Spirit Org",
    description: "Greek-letter sorority or women's spirit organization",
    Icon: UsersRound,
  },
  {
    value: "club_sports",
    label: "Sports",
    description: "Club sports team or varsity program",
    Icon: Trophy,
  },
  {
    value: "general_org",
    label: "Club",
    description: "Student clubs, societies, and campus organizations",
    Icon: GraduationCap,
  },
] as const;

interface OnboardingWizardProps {
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
  const colorsLocked = useRef(false);
  const [identity, setIdentity] = useState<ChapterIdentityValue>({
    universityId: "",
    greekAffiliationId: "",
    primaryColor: REGAL_PRIMARY,
    secondaryColor: REGAL_SECONDARY,
  });
  const [joinedOrgId, setJoinedOrgId] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    phone: "",
    classYear: "",
    major: "",
    hometown: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
  });

  const product = orgType ? getProductId(orgType) : "greek";
  const isGreek = orgType === "fraternity" || orgType === "sorority";
  const namePlaceholder = isGreek
    ? "Phi Kappa Tau — Epsilon Alpha"
    : product === "sports"
      ? "Texas A&M Rugby"
      : "Campus Photography Club";

  function handleIdentityChange(next: ChapterIdentityValue) {
    colorsLocked.current = true;
    setIdentity(next);
  }

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
          universityId: identity.universityId || undefined,
          greekAffiliationId: identity.greekAffiliationId || undefined,
          primaryColor: identity.primaryColor,
          secondaryColor: identity.secondaryColor,
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
    if (data.org?.id) {
      document.cookie = `touse_active_org_id=${data.org.id}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      setJoinedOrgId(data.org.id);
    }
    if (data.needsProfile) {
      setStep(5);
      return;
    }
    router.push(data.redirectTo ?? "/home");
    router.refresh();
  }

  async function completeProfile() {
    if (!joinedOrgId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: joinedOrgId, ...profileForm }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to save profile");
        return;
      }
      toast.success("Profile saved!");
      router.push("/home");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const shellTitle =
    step === 1 ? "Welcome to TouseOS"
      : step === 2 ? (mode === "create" ? "Add another organization" : "Choose your org type")
        : step === 3 ? "Set up your workspace"
          : step === 4 ? "Join with invite code"
            : "Complete your profile";

  const shellSubtitle =
    step === 1 ? "Create your chapter or join with an invite code from your officers."
      : step === 2 ? "Select the type that best describes your organization."
        : step === 3 ? "Name your org, pick your campus, and set brand colors."
          : step === 4 ? "Enter the code shared by an officer."
            : "Help your officers reach you and keep chapter records up to date.";

  return (
    <OnboardingShell title={shellTitle} subtitle={shellSubtitle}>
      {allowBackToDashboard && step === 1 && (
        <Link
          href="/home"
          className="type-small"
          style={{ color: "var(--color-text-muted)", marginBottom: 16, display: "inline-block" }}
        >
          ← Back to home
        </Link>
      )}

      {step === 1 && (
        <div className="ds-page-stack" style={{ gap: 16 }}>
          <button type="button" className="ds-card ds-card-interactive" style={{ cursor: "pointer", width: "100%", textAlign: "left" }} onClick={() => setStep(2)}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  width: 44, height: 44, borderRadius: 8,
                  background: "color-mix(in srgb, var(--color-org-primary) 12%, transparent)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <Building2 size={20} style={{ color: "var(--color-org-primary)" }} />
              </span>
              <div style={{ flex: 1 }}>
                <p className="type-body" style={{ fontWeight: 500, margin: 0 }}>Create a new organization</p>
                <p className="type-small" style={{ color: "var(--color-text-muted)", margin: "4px 0 0" }}>
                  Set up your chapter or team workspace
                </p>
              </div>
              <ChevronRight size={16} style={{ color: "var(--color-text-muted)" }} />
            </div>
          </button>

          <button type="button" className="ds-card ds-card-interactive" style={{ cursor: "pointer", width: "100%", textAlign: "left" }} onClick={() => setStep(4)}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  width: 44, height: 44, borderRadius: 8,
                  background: "color-mix(in srgb, var(--color-school-accent) 12%, transparent)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <Users size={20} style={{ color: "var(--color-school-accent)" }} />
              </span>
              <div style={{ flex: 1 }}>
                <p className="type-body" style={{ fontWeight: 500, margin: 0 }}>Join with invite code</p>
                <p className="type-small" style={{ color: "var(--color-text-muted)", margin: "4px 0 0" }}>
                  Enter the code from your officer
                </p>
              </div>
              <ChevronRight size={16} style={{ color: "var(--color-text-muted)" }} />
            </div>
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="ds-page-stack" style={{ gap: 12 }}>
          {mode === "create" && (
            <p className="type-small" style={{ color: "var(--color-text-muted)", margin: 0 }}>
              Each org is a separate workspace — Greek chapter, sports team, or student club.
            </p>
          )}
          {ORG_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => { setOrgType(type.value); setStep(3); }}
              className="ds-card"
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "16px 20px", textAlign: "left", cursor: "pointer",
                minHeight: 44, background: "var(--color-bg-raised)",
              }}
            >
              <span
                style={{
                  width: 44, height: 44, borderRadius: 8, flexShrink: 0,
                  background: "color-mix(in srgb, var(--color-org-primary) 10%, transparent)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <type.Icon size={20} style={{ color: "var(--color-org-primary)" }} />
              </span>
              <div>
                <p className="type-body" style={{ fontWeight: 500, margin: 0 }}>{type.label}</p>
                <p className="type-small" style={{ color: "var(--color-text-muted)", margin: "4px 0 0" }}>
                  {type.description}
                </p>
              </div>
            </button>
          ))}
          {mode === "welcome" ? (
            <Button variant="secondary" onClick={() => setStep(1)} style={{ width: "100%", minHeight: 44 }}>
              Back
            </Button>
          ) : (
            <Link
              href="/home"
              className="type-small"
              style={{ display: "block", textAlign: "center", color: "var(--color-text-muted)" }}
            >
              Cancel
            </Link>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="ds-page-stack" style={{ gap: 16 }}>
          <Input
            label="Organization name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={namePlaceholder}
          />
          {orgType && (
            <ChapterIdentityPicker
              orgType={orgType}
              value={identity}
              onChange={handleIdentityChange}
              colorsLocked={colorsLocked.current}
            />
          )}
          <Input
            label="Council / league"
            value={form.councilOrLeague}
            onChange={(e) => setForm({ ...form, councilOrLeague: e.target.value })}
          />
          <Input
            label="Contact email"
            type="email"
            value={form.contactEmail}
            onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="secondary" onClick={() => setStep(2)} style={{ flex: 1, minHeight: 44 }}>
              Back
            </Button>
            <Button
              onClick={createOrg}
              loading={loading}
              disabled={!form.name.trim()}
              style={{ flex: 1, minHeight: 44 }}
            >
              Create
            </Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="ds-page-stack" style={{ gap: 16 }}>
          <Input
            label="Invite code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="ABCD1234"
          />
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="secondary" onClick={() => setStep(1)} style={{ flex: 1, minHeight: 44 }}>
              Back
            </Button>
            <Button onClick={joinByCode} loading={loading} style={{ flex: 1, minHeight: 44 }}>
              Join
            </Button>
          </div>
        </div>
      )}
      {step === 5 && (
        <div className="ds-page-stack" style={{ gap: 16 }}>
          <Input label="Phone" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="(555) 123-4567" />
          <AcademicProfileFields
            values={{ classYear: profileForm.classYear, major: profileForm.major, hometown: profileForm.hometown }}
            onChange={(updates) => setProfileForm({ ...profileForm, ...updates })}
          />
          <Input label="Emergency contact name" value={profileForm.emergencyContactName} onChange={(e) => setProfileForm({ ...profileForm, emergencyContactName: e.target.value })} />
          <Input label="Emergency contact phone" value={profileForm.emergencyContactPhone} onChange={(e) => setProfileForm({ ...profileForm, emergencyContactPhone: e.target.value })} />
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="secondary" onClick={() => { router.push("/home"); router.refresh(); }} style={{ flex: 1, minHeight: 44 }}>Skip for now</Button>
            <Button onClick={completeProfile} loading={loading} style={{ flex: 1, minHeight: 44 }}>Save & continue</Button>
          </div>
        </div>
      )}
    </OnboardingShell>
  );
}
