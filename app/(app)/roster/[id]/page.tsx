import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";
import {
  Badge, Card, CardHeader
, ProgressBar,
} from "@/components/ui";
import {
  Briefcase, Calendar, ChevronLeft, GraduationCap,
  Heart, Mail, MapPin, Phone, Shield, Star, Users,
} from "lucide-react";
import { formatDate, getStatusColor } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/permissions";
import type { MemberProfile, Payment } from "@/types";

export const dynamic = "force-dynamic";

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: viewerMembership } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .neq("status", "removed")
    .limit(1)
    .single();

  const viewerRole = String(viewerMembership?.role ?? "general_member") as RoleName;
  const canSeeSensitive = can(viewerRole, "edit_roster") || can(viewerRole, "view_payments") || can(viewerRole, "manage_payments");


  const [memberRes, paymentsRes
, rsvpsRes] = await Promise.all([
    supabase.from("member_profiles").select("*").eq("id", id).single(),
    supabase.from("payments").select("amount, paid_amount, status, due_date, created_at").eq("member_id", id).order("due_date", { ascending: false }).limit(10),
    supabase.from("event_rsvps").select("id, status, checked_in, events(title, starts_at, type)").eq("member_id", id).order("created_at", { ascending: false }).limit(10),
  ]);

  if (!memberRes.data) notFound();
  const member = memberRes.data as MemberProfile & {
    bio?: string; pronouns?: string; interests?: string[];
    instagram_url?: string; linkedin_url?: string; profile_visibility?: string;
  };
  const payments = (paymentsRes.data ?? []) as Payment[];
  const rsvps = (rsvpsRes.data ?? []) as Array<Record<string, unknown>>;

  const paid = payments.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
  const outstanding = payments.filter((p) => ["pending","overdue"].includes(p.status)).reduce((s, p) => s + (Number(p.amount) - Number(p.paid_amount)), 0);
  const attendanceCount = rsvps.filter((r) => r.checked_in).length;
  const rsvpCount = rsvps.filter((r) => r.status === "going").length;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-2">
        <Link href="/roster" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft size={16} />
          Roster
        </Link>
      </div>

      {/* Profile header */}
      <Card>
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            {member.profile_photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={member.profile_photo_url} alt={member.full_name} className="w-20 h-20 rounded-2xl object-cover border-2 border-border" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-greek-100 dark:bg-greek-950/50 flex items-center justify-center text-2xl font-bold text-greek-700">
                {member.full_name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${member.membership_status === "active" ? "bg-green-500" : "bg-gray-400"}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="text-xl font-bold text-foreground">{member.full_name}</h1>
                {member.preferred_name && member.preferred_name !== member.full_name && (
                  <p className="text-sm text-muted-foreground">&ldquo;{member.preferred_name}&rdquo;{member.pronouns ? ` · ${member.pronouns}` : ""}</p>
                )}
              </div>
              <Badge label={member.membership_status} color={getStatusColor(member.membership_status) as "green"} />
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              <Badge label={ROLE_LABELS[member.role as keyof typeof ROLE_LABELS] ?? member.role} color="blue" />
              {member.committees?.map((c) => <Badge key={c} label={c} color="gray" />)}
            </div>

            {member.bio && <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{member.bio}</p>}
          </div>
        </div>

        {/* Contact row */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border">
          {member.email && (
            <a href={`mailto:${member.email}`} className="flex items-center gap-1.5 text-sm text-greek-600 hover:underline">
              <Mail size={14} />{member.email}
            </a>
          )}
          {member.phone && (
            <a href={`tel:${member.phone}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <Phone size={14} />{member.phone}
            </a>
          )}
          {member.instagram_url && (
            <a href={`https://instagram.com/${member.instagram_url.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <Star size={14} />{member.instagram_url}
            </a>
          )}
        </div>
      </Card>

      {/* Info grid */}
      <div className="grid sm:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Personal info" icon={<Users size={16} />} />
          <dl className="space-y-2">
            {[
              { label: "Class year", value: member.class_year, icon: <GraduationCap size={14} /> },
              { label: "Graduation year", value: member.graduation_year, icon: <GraduationCap size={14} /> },
              { label: "Major", value: member.major, icon: <Briefcase size={14} /> },
              { label: "Hometown", value: member.hometown, icon: <MapPin size={14} /> },
              { label: "Birthday", value: member.birthday ? formatDate(member.birthday) : null, icon: <Heart size={14} /> },
            ].filter((item) => item.value).map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="text-muted-foreground flex-shrink-0">{item.icon}</span>
                <span className="text-xs text-muted-foreground w-24 flex-shrink-0">{item.label}:</span>
                <span className="text-sm text-foreground">{String(item.value)}</span>
              </div>
            ))}
            {member.interests && member.interests.length > 0 && (
              <div className="pt-1">
                <p className="text-xs text-muted-foreground mb-1.5">Interests</p>
                <div className="flex flex-wrap gap-1.5">
                  {member.interests.map((i) => (
                    <span key={i} className="text-xs bg-surface-2 rounded-full px-2 py-0.5 text-muted-foreground">{i}</span>
                  ))}
                </div>
              </div>
            )}
          </dl>
        </Card>

        <Card>
          <CardHeader title="Payment summary" icon={<Shield size={16} />} />
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-surface-1 rounded"><p className="text-xs text-muted-foreground">Paid</p><p className="text-sm font-bold text-green-600">${paid.toFixed(0)}</p></div>
              <div className="p-2 bg-surface-1 rounded"><p className="text-xs text-muted-foreground">Outstanding</p><p className={`text-sm font-bold ${outstanding > 0 ? "text-red-500" : "text-muted-foreground"}`}>${outstanding.toFixed(0)}</p></div>
            </div>
            <Badge label={member.payment_status} color={member.payment_status === "current" ? "green" : "red"} />
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Attendance</p>
            <ProgressBar value={member.attendance_rate} label={`${attendanceCount} events attended · ${member.attendance_rate}%`} color={member.attendance_rate >= 80 ? "green" : "yellow"} size="md" />
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Forms</p>
            <ProgressBar value={member.forms_required > 0 ? Math.round((member.forms_completed / member.forms_required) * 100) : 100} label={`${member.forms_completed}/${member.forms_required} completed`} color={member.forms_completed === member.forms_required ? "green" : "red"} />
          </div>
        </Card>
      </div>

      {/* Event history */}
      {rsvps.length > 0 && (
        <Card>
          <CardHeader title="Event history" description={`${rsvpCount} RSVPs · ${attendanceCount} attended`} icon={<Calendar size={16} />} />
          <div className="space-y-2">
            {rsvps.map((rsvp) => {
              const event = rsvp.events as Record<string, unknown>;
              return (
                <div key={String(rsvp.id)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-1">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${rsvp.checked_in ? "bg-green-500" : rsvp.status === "going" ? "bg-blue-500" : "bg-gray-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{String(event?.title ?? "—")}</p>
                    {Boolean(event?.starts_at) && <p className="text-xs text-muted-foreground">{formatDate(String(event?.starts_at))}</p>}
                  </div>
                  <Badge label={Boolean(rsvp.checked_in) ? "Attended" : String(rsvp.status)} color={Boolean(rsvp.checked_in) ? "green" : "gray"} />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Emergency contact — officer-only */}
      {canSeeSensitive && member.notes && (
        <Card>
          <CardHeader title="Officer notes" description="Permission restricted — visible to officers only" />
          <p className="text-sm whitespace-pre-wrap">{member.notes}</p>
        </Card>
      )}

      {canSeeSensitive && (member.emergency_contact_name || member.emergency_contact_phone) && (
        <Card>
          <CardHeader title="Emergency contact" description="Restricted — officer and admin access only" icon={<Phone size={16} />} />
          <div className="p-3 rounded-lg bg-surface-1 border border-border">
            <p className="text-sm font-medium">{member.emergency_contact_name ?? "—"}</p>
            {member.emergency_contact_phone && (
              <a href={`tel:${member.emergency_contact_phone}`} className="text-sm text-greek-600">{member.emergency_contact_phone}</a>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
