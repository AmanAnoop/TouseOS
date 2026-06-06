"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/hooks/use-org";
import { PageHeader, Tabs } from "@/components/ui";
import type { MemberProfile } from "@/types";
import { NmeProgressBanner } from "@/components/nme/nme-progress-banner";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileForm } from "@/components/profile/profile-form";
import { PrivacySettings } from "@/components/profile/privacy-settings";
import { GreekMatchSettings, type GreekMatchFormData } from "@/components/profile/greekmatch-settings";
import { GreekMatchPhotos } from "@/components/profile/greekmatch-photos";

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
  const [gmPhotos, setGmPhotos] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const profileQuery = orgId
        ? supabase.from("member_profiles").select("*").eq("user_id", user.id).eq("org_id", orgId).maybeSingle()
        : supabase.from("member_profiles").select("*").eq("user_id", user.id).limit(1).maybeSingle();

      const [mpRes, rolesRes, gmRes] = await Promise.all([
        profileQuery,
        supabase.from("org_members").select("org_id, role, organizations(name, type)").eq("user_id", user.id).neq("status", "removed"),
        supabase.from("greekmatch_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      ]);

      if (mpRes.data) {
        const mp = mpRes.data as MemberProfile & { bio?: string; pronouns?: string; interests?: string[]; instagram_url?: string; linkedin_url?: string; twitter_url?: string; profile_visibility?: string };
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

      if (rolesRes.data) {
        setOrgRoles(rolesRes.data.map((r: Record<string, unknown>) => ({
          org_id: String(r.org_id),
          role: String(r.role),
          org_name: String((r.organizations as Record<string, unknown>)?.name ?? ""),
          org_type: String((r.organizations as Record<string, unknown>)?.type ?? ""),
        })));
      }

      if (gmRes.data) {
        setGmSection({
          optedIn: true,
          displayName: String(gmRes.data.display_name ?? ""),
          age: String(gmRes.data.age ?? ""),
          gender: String(gmRes.data.gender ?? ""),
          interestedIn: (gmRes.data.interested_in as string[]) ?? [],
          showOrgName: Boolean(gmRes.data.show_org_name ?? true),
          showFullName: Boolean(gmRes.data.show_full_name ?? false),
          sameOrgOk: Boolean(gmRes.data.same_org_ok ?? false),
          geoRadius: "25",
          minAge: String(gmRes.data.min_age ?? "18"),
          maxAge: String(gmRes.data.max_age ?? "30"),
        });
        const photosRes = await fetch("/api/greekmatch/photos");
        if (photosRes.ok) {
          const photosData = await photosRes.json();
          setGmPhotos((photosData.photos as string[]) ?? []);
        }
      } else {
        setGmSection((prev) => ({
          ...prev,
          displayName: (mpRes.data as MemberProfile)?.preferred_name ?? (mpRes.data as MemberProfile)?.full_name?.split(" ")[0] ?? "",
        }));
      }
    }
    load();
  }, [supabase, orgId]);

  async function saveProfile() {
    if (!userId || !memberProfile) return;
    setSaving(true);
    const { error } = await supabase
      .from("member_profiles")
      .update({
        preferred_name: form.preferredName || null,
        phone: form.phone || null,
        class_year: form.classYear || null,
        graduation_year: form.graduationYear ? parseInt(form.graduationYear) : null,
        major: form.major || null,
        hometown: form.hometown || null,
        bio: form.bio || null,
        pronouns: form.pronouns || null,
        emergency_contact_name: form.emergencyContactName || null,
        emergency_contact_phone: form.emergencyContactPhone || null,
        instagram_url: form.instagramUrl || null,
        linkedin_url: form.linkedinUrl || null,
        twitter_url: form.twitterUrl || null,
        profile_visibility: form.profileVisibility,
        interests: form.interests,
        profile_photo_url: form.profilePhotoUrl || null,
      })
      .eq("user_id", userId)
      .eq("org_id", memberProfile.org_id);

    setSaving(false);
    if (error) { toast.error(error.message); return; }
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
    const currentOrg = orgRoles.find((r) => r.org_type === "fraternity" || r.org_type === "sorority");
    if (!currentOrg) { toast.error("GreekMatch is for Greek organizations only."); setSaving(false); return; }

    const payload = {
      user_id: userId,
      org_id: currentOrg.org_id,
      display_name: gmSection.displayName,
      age: gmSection.age ? parseInt(gmSection.age) : null,
      gender: gmSection.gender || null,
      interested_in: gmSection.interestedIn,
      show_org_name: gmSection.showOrgName,
      show_full_name: gmSection.showFullName,
      same_org_ok: gmSection.sameOrgOk,
      min_age: parseInt(gmSection.minAge),
      max_age: parseInt(gmSection.maxAge),
      is_active: true,
      paused: false,
    };

    const { error } = await supabase.from("greekmatch_profiles").upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setGmSection((prev) => ({ ...prev, optedIn: true }));
    toast.success("GreekMatch profile saved! You can now discover matches.");
  }

  async function pauseGreekMatch() {
    if (!userId) return;
    await supabase.from("greekmatch_profiles").update({ paused: true }).eq("user_id", userId);
    toast.success("GreekMatch paused. You won't appear in discovery.");
  }

  async function optOutGreekMatch() {
    if (!userId) return;
    await supabase.from("greekmatch_profiles").update({ is_active: false }).eq("user_id", userId);
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

      {orgId && <NmeProgressBanner orgId={orgId} />}

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
          ...(isGreekMember ? [{ id: "greekmatch", label: "GreekMatch" }] : []),
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
        <div className="space-y-4">
          <GreekMatchPhotos photos={gmPhotos} onChange={setGmPhotos} />
          <GreekMatchSettings
            form={gmSection}
            saving={saving}
            onChange={(updates) => setGmSection({ ...gmSection, ...updates })}
            onToggleInterest={toggleGmInterest}
            onSave={saveGreekMatch}
            onPause={pauseGreekMatch}
            onOptOut={optOutGreekMatch}
          />
        </div>
      )}
    </div>
  );
}
