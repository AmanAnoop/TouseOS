"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Input, Alert } from "@/components/ui";
import { Heart, CheckCircle2 } from "lucide-react";

export default function PnmInterestFormPage() {
  const params = useParams();
  const slug = params.slug as string;
  const supabase = createClient();

  const [org, setOrg] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    classYear: "",
    major: "",
    hometown: "",
    instagramHandle: "",
    referralSource: "",
    smsConsent: false,
  });

  useEffect(() => {
    async function loadOrg() {
      // slug is the invite_code (public, safe to expose)
      const { data } = await supabase
        .from("organizations")
        .select("id, name, type, campus, logo_url, primary_color, contact_email")
        .eq("invite_code", slug.toUpperCase())
        .single();

      if (data) setOrg(data as Record<string, unknown>);
      setLoading(false);
    }
    loadOrg();
  }, [supabase, slug]);

  async function submitForm() {
    if (!org || !form.fullName) return;
    setSubmitting(true);

    const { error } = await supabase.from("pnm_leads").insert({
      org_id: org.id,
      full_name: form.fullName,
      email: form.email || null,
      phone: form.phone || null,
      instagram_handle: form.instagramHandle || null,
      class_year: form.classYear || null,
      major: form.major || null,
      hometown: form.hometown || null,
      referral_source: form.referralSource || null,
      communication_consent: form.smsConsent,
      consent_timestamp: form.smsConsent ? new Date().toISOString() : null,
      consent_source: "interest_form",
      campaign: slug,
      status: "lead",
    });

    setSubmitting(false);
    if (error) { alert("Submission failed. Please try again."); return; }
    setSubmitted(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-2 border-greek-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-sm w-full text-center p-8">
          <p className="text-foreground font-semibold">Organization not found</p>
          <p className="text-muted-foreground text-sm mt-1">Please check the link and try again.</p>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-sm w-full text-center p-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: String(org.primary_color) }}>
            <CheckCircle2 size={28} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-foreground">You&apos;re on the list!</h2>
          <p className="text-muted-foreground mt-2">
            Thanks for your interest in <strong>{String(org.name)}</strong>. Our recruitment team will be in touch soon.
          </p>
          {form.smsConsent && (
            <p className="text-xs text-muted-foreground mt-3">
              You&apos;ve opted in to receive SMS updates. Reply STOP at any time to opt out.
            </p>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          {org.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={String(org.logo_url)} alt={String(org.name)} className="w-20 h-20 rounded-2xl object-contain mx-auto mb-4 border border-border" />
          ) : (
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold" style={{ background: String(org.primary_color) }}>
              {String(org.name).slice(0, 2).toUpperCase()}
            </div>
          )}
          <h1 className="text-2xl font-bold text-foreground">{String(org.name)}</h1>
          <p className="text-muted-foreground mt-1">{String(org.campus ?? "")}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Interested in joining? Fill out this form and we&apos;ll reach out!
          </p>
        </div>

        <Card>
          <div className="space-y-4">
            <Input label="Full name *" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Alex Johnson" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@college.edu" />
              <Input label="Phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 (555) 000-0000" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Class year" value={form.classYear} onChange={(e) => setForm({ ...form, classYear: e.target.value })} placeholder="2027" />
              <Input label="Major" value={form.major} onChange={(e) => setForm({ ...form, major: e.target.value })} placeholder="Business, CS..." />
            </div>
            <Input label="Hometown" value={form.hometown} onChange={(e) => setForm({ ...form, hometown: e.target.value })} placeholder="Austin, TX" />
            <Input label="Instagram handle (optional)" value={form.instagramHandle} onChange={(e) => setForm({ ...form, instagramHandle: e.target.value })} placeholder="@yourusername" />
            <Input label="How did you hear about us?" value={form.referralSource} onChange={(e) => setForm({ ...form, referralSource: e.target.value })} placeholder="Friend, social media, campus event..." />

            {/* SMS consent */}
            <div className="border border-border rounded-xl p-4 bg-surface-1">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="rounded mt-0.5" checked={form.smsConsent} onChange={(e) => setForm({ ...form, smsConsent: e.target.checked })} />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Yes, I&apos;d like to receive text messages about recruitment events
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    By checking this box, you consent to receive SMS from {String(org.name)}. Reply STOP to opt out at any time. Message & data rates may apply. This is completely optional.
                  </p>
                </div>
              </label>
            </div>

            <Button
              onClick={submitForm}
              loading={submitting}
              disabled={!form.fullName}
              className="w-full"
              style={{ background: String(org.primary_color) }}
              icon={<Heart size={14} />}
            >
              Submit interest form
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Your information is only shared with {String(org.name)} officers. We never sell data.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
