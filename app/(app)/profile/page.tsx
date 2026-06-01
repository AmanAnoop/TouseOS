"use client";

import { useState, useEffect, useRef } from "react";
import { Check, Heart, Save, User } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import {
  Alert, Badge, Button, Card, CardHeader,
  Input, Modal, PageHeader, Tabs,
} from "@/components/ui";
import type { MemberProfile } from "@/types";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileForm } from "@/components/profile/profile-form";
import { PrivacySettings } from "@/components/profile/privacy-settings";


interface OrgRole { org_id: string; role: string; org_name: string; org_type: string }

export default function ProfilePage() {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

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

  const [gmSection, setGmSection] = useState({
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

  const [confirmOptOut, setConfirmOptOut] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [mpRes, rolesRes, gmRes] = await Promise.all([
        supabase.from("member_profiles").select("*").eq("user_id", user.id).limit(1).single(),
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
        // profile loaded
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
      } else {
        setGmSection((prev) => ({
          ...prev,
          displayName: (mpRes.data as MemberProfile)?.preferred_name ?? (mpRes.data as MemberProfile)?.full_name?.split(" ")[0] ?? "",
        }));
      }
    }
    load();
  }, [supabase]);

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
      .eq("user_id", userId);

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
    // profile set
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
    // profile cleared
    setConfirmOptOut(false);
    toast.success("You&apos;ve been removed from GreekMatch.");
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
          saving={saving}
          onChange={(v) => setForm({ ...form, profileVisibility: v })}
          onSave={saveProfile}
        />
      )}

      {/* ── GreekMatch tab ───────────────────────────────────── */}
      {tab === "greekmatch" && (
        <div className="space-y-4">
          {/* GreekMatch header */}
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-pink-500 via-rose-500 to-red-500 p-6 text-white">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Heart size={20} className="fill-white" />
                <span className="font-bold text-lg">GreekMatch</span>
                <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">Beta</span>
              </div>
              <p className="text-white/90 text-sm max-w-sm">
                Meet verified Greek students across campus. 100% opt-in, privacy-first, and exclusive to your university&apos;s Greek community.
              </p>
              {gmSection.optedIn && (
                <Badge label="Active" color="green" className="mt-3 bg-white/20 text-white border-transparent" />
              )}
            </div>
          </div>

          {!gmSection.optedIn ? (
            <>
              <Alert
                type="info"
                title="How GreekMatch works"
                description="You'll only be shown to other opted-in Greek students. Your org chapter info is not shared beyond your org name (optional). You can pause or opt out at any time."
              />
              <Card>
                <CardHeader title="Set up your GreekMatch profile" description="Only visible to other opted-in Greek members" />
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input
                      label="Display name"
                      placeholder="Alex (first name only recommended)"
                      hint="We recommend using your first name only for privacy."
                      value={gmSection.displayName}
                      onChange={(e) => setGmSection({ ...gmSection, displayName: e.target.value })}
                    />
                    <Input
                      label="Age"
                      type="number"
                      placeholder="21"
                      hint="Must be 18+"
                      value={gmSection.age}
                      onChange={(e) => setGmSection({ ...gmSection, age: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium block mb-1.5">I identify as</label>
                    <div className="flex gap-2 flex-wrap">
                      {["man","woman","nonbinary","prefer not to say"].map((g) => (
                        <button
                          key={g}
                          onClick={() => setGmSection({ ...gmSection, gender: g })}
                          className={`px-3 py-1.5 rounded-full text-sm border transition-colors capitalize ${gmSection.gender === g ? "bg-rose-500 text-white border-rose-500" : "border-border text-muted-foreground hover:border-rose-400"}`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium block mb-1.5">Interested in</label>
                    <p className="text-xs text-muted-foreground mb-2">Select all that apply</p>
                    <div className="flex gap-2 flex-wrap">
                      {["men","women","nonbinary people","everyone"].map((val) => (
                        <button
                          key={val}
                          onClick={() => toggleGmInterest(val)}
                          className={`px-3 py-1.5 rounded-full text-sm border transition-colors capitalize ${gmSection.interestedIn.includes(val) ? "bg-rose-500 text-white border-rose-500" : "border-border text-muted-foreground hover:border-rose-400"}`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input label="Min age preference" type="number" value={gmSection.minAge} onChange={(e) => setGmSection({ ...gmSection, minAge: e.target.value })} />
                    <Input label="Max age preference" type="number" value={gmSection.maxAge} onChange={(e) => setGmSection({ ...gmSection, maxAge: e.target.value })} />
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader title="Privacy controls" />
                <div className="space-y-3">
                  {[
                    { key: "showOrgName", label: "Show org name", description: "Show which Greek org you're in (e.g. 'Kappa Delta')" },
                    { key: "showFullName", label: "Show full name", description: "Show your last name on your profile" },
                    { key: "sameOrgOk", label: "Allow same-org matches", description: "Allow matching with members of your own chapter" },
                  ].map((opt) => (
                    <label key={opt.key} className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-0.5 rounded"
                        checked={Boolean(gmSection[opt.key as keyof typeof gmSection])}
                        onChange={(e) => setGmSection({ ...gmSection, [opt.key]: e.target.checked })}
                      />
                      <div>
                        <p className="text-sm font-medium">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </Card>

              <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-xl p-4 text-sm text-rose-800 dark:text-rose-300">
                <p className="font-semibold mb-1">By opting in to GreekMatch you agree that:</p>
                <ul className="space-y-1 text-xs">
                  <li>✓ You are 18+ years old</li>
                  <li>✓ Your profile will be visible to other opted-in Greek members on your campus</li>
                  <li>✓ You can pause or remove your profile at any time</li>
                  <li>✓ You will use GreekMatch respectfully and not harass other users</li>
                </ul>
              </div>

              <Button
                onClick={saveGreekMatch}
                loading={saving}
                disabled={!gmSection.displayName || !gmSection.gender || gmSection.interestedIn.length === 0}
                className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
                icon={<Heart size={14} className="fill-white" />}
              >
                Join GreekMatch
              </Button>
            </>
          ) : (
            <>
              <Card>
                <CardHeader title="Your GreekMatch profile" action={
                  <Badge label="Active" color="green" dot />
                } />
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Display name</label>
                    <input className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={gmSection.displayName} onChange={(e) => setGmSection({ ...gmSection, displayName: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Age</label>
                    <input type="number" className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={gmSection.age} onChange={(e) => setGmSection({ ...gmSection, age: e.target.value })} />
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Interested in</p>
                  <div className="flex gap-2 flex-wrap">
                    {["men","women","nonbinary people","everyone"].map((val) => (
                      <button key={val} onClick={() => toggleGmInterest(val)} className={`px-3 py-1.5 rounded-full text-sm border transition-colors capitalize ${gmSection.interestedIn.includes(val) ? "bg-rose-500 text-white border-rose-500" : "border-border text-muted-foreground"}`}>{val}</button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {[
                    { key: "showOrgName", label: "Show org name" },
                    { key: "showFullName", label: "Show full name" },
                    { key: "sameOrgOk", label: "Allow same-org matches" },
                  ].map((opt) => (
                    <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded" checked={Boolean(gmSection[opt.key as keyof typeof gmSection])} onChange={(e) => setGmSection({ ...gmSection, [opt.key]: e.target.checked })} />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))}
                </div>

                <div className="flex gap-2 mt-5">
                  <Button onClick={saveGreekMatch} loading={saving} icon={<Save size={14} />} className="flex-1 bg-rose-500 hover:bg-rose-600">
                    Save changes
                  </Button>
                  <Button variant="secondary" onClick={pauseGreekMatch}>
                    Pause
                  </Button>
                  <Button variant="danger" onClick={() => setConfirmOptOut(true)}>
                    Opt out
                  </Button>
                </div>
              </Card>

              <div className="grid sm:grid-cols-3 gap-3">
                <a href="/greekmatch" className="block">
                  <Card padding="sm" className="text-center hover:border-rose-300 transition-colors cursor-pointer">
                    <Heart size={20} className="mx-auto text-rose-500 mb-1" />
                    <p className="text-sm font-semibold">Discover</p>
                    <p className="text-xs text-muted-foreground">Find matches</p>
                  </Card>
                </a>
                <a href="/greekmatch/matches" className="block">
                  <Card padding="sm" className="text-center hover:border-rose-300 transition-colors cursor-pointer">
                    <Check size={20} className="mx-auto text-green-500 mb-1" />
                    <p className="text-sm font-semibold">Matches</p>
                    <p className="text-xs text-muted-foreground">View & chat</p>
                  </Card>
                </a>
                <a href="/greekmatch/setup" className="block">
                  <Card padding="sm" className="text-center hover:border-rose-300 transition-colors cursor-pointer">
                    <User size={20} className="mx-auto text-blue-500 mb-1" />
                    <p className="text-sm font-semibold">Edit profile</p>
                    <p className="text-xs text-muted-foreground">Photos & bio</p>
                  </Card>
                </a>
              </div>
            </>
          )}
        </div>
      )}

      {/* Opt-out confirm modal */}
      <Modal
        open={confirmOptOut}
        onClose={() => setConfirmOptOut(false)}
        title="Opt out of GreekMatch?"
        description="Your profile will be hidden and your matches will be archived. You can re-join anytime."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOptOut(false)}>Keep my profile</Button>
            <Button variant="danger" onClick={optOutGreekMatch}>Opt out</Button>
          </>
        }
      >
        <Alert type="warning" title="This will remove your profile from discovery and archive your current matches." />
      </Modal>
    </div>
  );
}
