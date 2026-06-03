"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/hooks/use-org";
import { PageHeader, Tabs } from "@/components/ui";
import type { MemberProfile } from "@/types";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileForm } from "@/components/profile/profile-form";
import { PrivacySettings } from "@/components/profile/privacy-settings";
import { GreekMatchSettings, type GreekMatchFormData } from "@/components/profile/greekmatch-settings";

interface OrgRole { org_id: string; role: string; org_name: string; org_type: string }

const VALID_TABS = ["profile", "privacy", "greekmatch"] as const;

export default function ProfilePage() {
  const supabase = createClient();
  const { orgId } = useOrg();
  const fileRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();

  const [tab, setTab] = useState("profile");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(null);
  const [orgRoles, setOrgRoles] = useState<OrgRole[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const [form, setForm] = useState({
    preferredName: "",
    phone: "",
    classYear: "",
    graduationYear: "",
    major: "",
    hometown: "",
    bio: "",
    pronouns: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    instagramUrl: "",
    linkedinUrl: "",
    twitterUrl: "",
    profileVisibility: "org_members",
    interests: [] as string[],
    profilePhotoUrl: "",
  });

  const [gmSection, setGmSection] = useState<GreekMatchFormData>({
    optedIn: false,
    displayName: "",
    age: "",
    gender: "",
    interestedIn: [] as string[],
    showOrgName: true,
    showFullName: false,
    sameOrgOk: false,
    geoRadius: "25",
    minAge: "18",
    maxAge: "30",
  });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      if (!orgId) return;

      const res = await fetch(`/api/profile?org_id=${encodeURIComponent(orgId)}`);
      if (!res.ok) return;
      const data = await res.json();

      if (data.memberProfile) {
        const mp = data.memberProfile as MemberProfile & { bio?: string; pronouns?: string; interests?: string[]; instagram_url?: string; linkedin_url?: string; twitter_url?: string; profile_visibility?: string };
        setMemberProfile(mp);
        setForm({
          preferredName: mp.preferred_name ?? "",
          phone: mp.phone ?? "",
          classYear: mp.class_year ?? "",
          graduationYear: String(mp.graduation_year ?? ""),
          major: mp.major ?? "",
          hometown: mp.hometown ?? "",
          bio: mp.bio ?? "",
          pronouns: mp.pronouns ?? "",
          emergencyContactName: mp.emergency_contact_name ?? "",
          emergencyContactPhone: mp.emergency_contact_phone ?? "",
          instagramUrl: mp.instagram_url ?? "",
          linkedinUrl: mp.linkedin_url ?? "",
          twitterUrl: mp.twitter_url ?? "",
          profileVisibility: mp.profile_visibility ?? "org_members",
          interests: mp.interests ?? [],
          profilePhotoUrl: mp.profile_photo_url ?? "",
        });
      }

      if (data.memberships) {
        setOrgRoles(data.memberships as OrgRole[]);
      }

      if (data.greekMatchProfile) {
        const gm = data.greekMatchProfile as Record<string, unknown>;
        setGmSection({
          optedIn: Boolean(gm.is_active),
          displayName: String(gm.display_name ?? ""),
          age: String(gm.age ?? ""),
          gender: String(gm.gender ?? ""),
          interestedIn: (gm.interested_in as string[]) ?? [],
          showOrgName: Boolean(gm.show_org_name ?? true),
          showFullName: Boolean(gm.show_full_name ?? false),
          sameOrgOk: Boolean(gm.same_org_ok ?? false),
          geoRadius: "25",
          minAge: String(gm.min_age ?? "18"),
          maxAge: String(gm.max_age ?? "30"),
        });
      } else if (data.memberProfile) {
        const mp = data.memberProfile as MemberProfile;
        setGmSection((prev) => ({
          ...prev,
          displayName: mp.preferred_name ?? mp.full_name?.split(" ")[0] ?? "",
        }));
      }
    }
    load();
  }, [supabase, orgId]);

  async function saveProfile() {
    if (!userId || !memberProfile || !orgId) return;
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        preferredName: form.preferredName,
        phone: form.phone,
        classYear: form.classYear,
        graduationYear: form.graduationYear,
        major: form.major,
        hometown: form.hometown,
        bio: form.bio,
        pronouns: form.pronouns,
        emergencyContactName: form.emergencyContactName,
        emergencyContactPhone: form.emergencyContactPhone,
        instagramUrl: form.instagramUrl,
        linkedinUrl: form.linkedinUrl,
        twitterUrl: form.twitterUrl,
        profileVisibility: form.profileVisibility,
        interests: form.interests,
        profilePhotoUrl: form.profilePhotoUrl,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? "Failed to save");
      return;
    }
    toast.success("Profile saved");
  }

  async function uploadAvatar(file: File) {
    if (!userId) return;
    setUploading(true);
    const path = `avatars/${userId}/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(data.path);
    setForm((prev) => ({ ...prev, profilePhotoUrl: urlData.publicUrl }));
    setUploading(false);
    toast.success("Photo updated");
  }

  async function saveGreekMatch() {
    if (!userId) return;
    setSaving(true);
    const isGreek = orgRoles.some((r) => r.org_type === "fraternity" || r.org_type === "sorority");
    if (!isGreek) {
      toast.error("GreekMatch is for Greek organizations only.");
      setSaving(false);
      return;
    }

    const res = await fetch("/api/greekmatch/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: gmSection.displayName,
        age: gmSection.age,
        gender: gmSection.gender,
        interestedIn: gmSection.interestedIn,
        showOrgName: gmSection.showOrgName,
        showFullName: gmSection.showFullName,
        sameOrgOk: gmSection.sameOrgOk,
        minAge: gmSection.minAge,
        maxAge: gmSection.maxAge,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? "Failed to save");
      return;
    }
    setGmSection((prev) => ({ ...prev, optedIn: true }));
    toast.success("GreekMatch profile saved! You can now discover matches.");
  }

  async function pauseGreekMatch() {
    const res = await fetch("/api/greekmatch/profiles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paused: true }),
    });
    if (!res.ok) {
      toast.error("Could not pause GreekMatch");
      return;
    }
    toast.success("GreekMatch paused. You won't appear in discovery.");
  }

  async function optOutGreekMatch() {
    const res = await fetch("/api/greekmatch/profiles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
    if (!res.ok) {
      toast.error("Could not opt out");
      return;
    }
    setGmSection((prev) => ({ ...prev, optedIn: false }));
    toast.success("You've been removed from GreekMatch.");
  }

  function toggleInterest(interest: string) {
    setForm((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  }

  function toggleGmInterest(val: string) {
    setGmSection((prev) => ({
      ...prev,
      interestedIn: prev.interestedIn.includes(val)
        ? prev.interestedIn.filter((v) => v !== val)
        : [...prev.interestedIn, val],
    }));
  }

  const isGreekMember = orgRoles.some((r) => r.org_type === "fraternity" || r.org_type === "sorority");

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t && VALID_TABS.includes(t as typeof VALID_TABS[number])) {
      if (t === "greekmatch" && !isGreekMember) return;
      setTab(t);
    }
  }, [searchParams, isGreekMember]);

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <PageHeader title="My Profile" description="Manage your personal information and privacy settings" />

      <ProfileHeader
        fullName={memberProfile?.full_name ?? "You"}
        photoUrl={form.profilePhotoUrl || null}
        orgRoles={orgRoles}
        uploading={uploading}
        onAvatarClick={() => fileRef.current?.click()}
      />
      <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />

      <Tabs
        tabs={[
          { id: "profile", label: "Profile" },
          { id: "privacy", label: "Privacy" },
          ...(isGreekMember ? [{ id: "greekmatch", label: "💚 GreekMatch" }] : []),
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "profile" && (
        <ProfileForm
          form={form}
          saving={saving}
          onChange={(updates) => setForm({ ...form, ...updates })}
          onToggleInterest={toggleInterest}
          onSave={saveProfile}
        />
      )}

      {tab === "privacy" && (
        <PrivacySettings
          profileVisibility={form.profileVisibility}
          onChange={(visibility) => setForm({ ...form, profileVisibility: visibility })}
          onSave={saveProfile}
          saving={saving}
        />
      )}

      {tab === "greekmatch" && (
        <GreekMatchSettings
          form={gmSection}
          saving={saving}
          onChange={(updates) => setGmSection({ ...gmSection, ...updates })}
          onToggleInterest={toggleGmInterest}
          onSave={saveGreekMatch}
          onPause={pauseGreekMatch}
          onOptOut={optOutGreekMatch}
        />
      )}
    </div>
  );
}
