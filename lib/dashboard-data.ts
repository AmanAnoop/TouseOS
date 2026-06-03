import type { SupabaseClient } from "@supabase/supabase-js";
import { computeHealthScore } from "@/lib/health-score";
import type { DeadlineItem } from "@/components/dashboard/upcoming-deadlines";
import { attachPhotoDisplayUrls } from "@/lib/photo-access";
import { isClubOrg, isGreekOrg, isSportsOrg } from "@/lib/utils";
import type {
  Announcement,
  Event,
  MemberProfile,
  Payment,
  Task,
} from "@/types";

export interface SetupStep {
  id: string;
  label: string;
  description: string;
  href: string;
  done: boolean;
}

export interface DashboardLoadParams {
  orgId: string;
  orgType: string;
  userId: string;
}

export interface DashboardData {
  members: MemberProfile[];
  events: Event[];
  payments: Payment[];
  announcements: Announcement[];
  tasks: Task[];
  myTasks: Task[];
  myProfile: MemberProfile | null;
  reimbs: Array<{ id: string; amount: number; status: string; created_at: string }>;
  budgets: Array<{ budget_lines?: Array<{ budgeted: number; actual: number; type: string }> }>;
  photos: Array<Record<string, unknown>>;
  pnmLeads: Array<{ status: string }>;
  sportsTrips: Array<{ id: string; title: string; status: string }>;
  waivers: Array<{ status: string; waiver_type?: string; member_id?: string }>;
  sportsTryouts: Array<{ id: string; status: string }>;
  clubApplications: Array<{ id: string; status: string }>;
  clubHours: Array<{ hours: number; verified: boolean }>;
  rsvps: Array<{ checked_in: boolean; event_id: string }>;
  attendanceTrend: Array<{ label: string; rate: number; checkedIn: number; total: number }>;
  engagementTrend: Array<{ label: string; photos: number; announcements: number }>;
  deadlineItems: DeadlineItem[];
  setupSteps: SetupStep[];
  stats: {
    activeCount: number;
    newMembers: number;
    alumniCount: number;
    totalExpected: number;
    totalCollected: number;
    collectionRate: number;
    overdueCount: number;
    unpaidMembers: number;
    pendingReimbs: number;
    pendingReimbAmount: number;
    budgetUsed: number;
    budgetTotal: number;
    budgetPct: number;
    formsIncomplete: number;
    avgAttendance: number;
    tasksDue: number;
    complianceIssues: number;
    complianceOk: boolean;
    totalClubHours: number;
  };
  health: {
    breakdown: ReturnType<typeof computeHealthScore>["breakdown"];
    composite: number | null;
    metricsUsed: number;
  };
}

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day + 6) % 7;
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function buildAttendanceTrend(
  pastEvents: Array<{ id: string; title: string; starts_at: string }>,
  pastRsvps: Array<{ checked_in: boolean; event_id: string }>,
) {
  return pastEvents
    .slice()
    .reverse()
    .map((e) => {
      const rows = pastRsvps.filter((r) => r.event_id === e.id);
      const total = rows.length;
      const checkedIn = rows.filter((r) => r.checked_in).length;
      const rate = total > 0 ? Math.round((checkedIn / total) * 100) : 0;
      return {
        label: new Date(e.starts_at).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        rate,
        checkedIn,
        total,
      };
    });
}

function buildEngagementTrend(
  recentPhotos: Array<{ created_at: string }>,
  recentAnnouncements: Array<{ created_at: string }>,
) {
  const now = new Date();
  return Array.from({ length: 5 }, (_, i) => {
    const start = startOfWeek(new Date(now.getTime() - (4 - i) * 7 * 86400000));
    const end = new Date(start.getTime() + 7 * 86400000);
    const label = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const photos = recentPhotos.filter((p) => {
      const ts = new Date(p.created_at);
      return ts >= start && ts < end;
    }).length;
    const announcements = recentAnnouncements.filter((a) => {
      const ts = new Date(a.created_at);
      return ts >= start && ts < end;
    }).length;
    return { label, photos, announcements };
  });
}

function buildDeadlineItems(
  tasks: Task[],
  paymentRows: Array<{
    id: string;
    amount: number;
    paid_amount: number;
    status: string;
    due_date: string | null;
    payment_items?: { title: string } | { title: string }[] | null;
  }>,
  members: MemberProfile[],
): DeadlineItem[] {
  const nowMs = Date.now();
  const items: DeadlineItem[] = [];

  for (const t of tasks) {
    if (!t.due_date) continue;
    items.push({
      id: t.id,
      kind: "task",
      title: t.title,
      dueAt: t.due_date,
      href: "/tasks",
      meta: t.assignee_name ?? undefined,
      overdue: new Date(t.due_date).getTime() < nowMs,
    });
  }

  for (const pay of paymentRows) {
    if (!pay.due_date || pay.status === "paid" || pay.status === "cancelled") continue;
    const remaining = Number(pay.amount) - Number(pay.paid_amount);
    if (remaining <= 0) continue;
    const item = pay.payment_items;
    const title =
      (Array.isArray(item) ? item[0]?.title : item?.title) ?? "Payment due";
    items.push({
      id: pay.id,
      kind: "payment",
      title,
      dueAt: pay.due_date,
      href: "/payments",
      meta: `$${remaining.toFixed(0)} remaining`,
      overdue: pay.status === "overdue" || new Date(pay.due_date).getTime() < nowMs,
    });
  }

  for (const m of members) {
    if (m.forms_required <= 0 || m.forms_completed >= m.forms_required) continue;
    const dueAt = new Date(nowMs + 14 * 86400000).toISOString();
    items.push({
      id: m.id,
      kind: "form",
      title: `${m.full_name} — forms incomplete`,
      dueAt,
      href: `/roster/${m.id}`,
      meta: `${m.forms_completed}/${m.forms_required} completed`,
    });
  }

  return items;
}

function buildSetupSteps(
  members: MemberProfile[],
  allEventsCount: number,
  payments: Payment[],
  announcements: Announcement[],
  budgets: DashboardData["budgets"],
): SetupStep[] {
  const hasBudget = budgets.some((b) => (b.budget_lines?.length ?? 0) > 0);
  return [
    {
      id: "roster",
      label: "Build your roster",
      description: members.length < 2 ? "Invite members to join your org" : "Roster has members",
      href: "/roster",
      done: members.length >= 2,
    },
    {
      id: "events",
      label: "Schedule an event",
      description: "Create your first chapter or team event",
      href: "/events/new",
      done: allEventsCount > 0,
    },
    {
      id: "dues",
      label: "Set up dues",
      description: "Create a charge so members can pay online",
      href: "/payments",
      done: payments.length > 0,
    },
    {
      id: "comms",
      label: "Post an announcement",
      description: "Keep everyone in the loop from Comms",
      href: "/comms",
      done: announcements.length > 0,
    },
    {
      id: "budget",
      label: "Create a budget",
      description: "Track spending against your chapter plan",
      href: "/budget",
      done: hasBudget,
    },
  ];
}

/** Load all dashboard queries and derived metrics for the Greek/general home page. */
export async function loadDashboardData(
  supabase: SupabaseClient,
  { orgId, orgType, userId }: DashboardLoadParams,
): Promise<DashboardData> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const nowIso = new Date().toISOString();

  const [
    membersRes,
    myProfileRes,
    eventsRes,
    paymentsRes,
    paymentDeadlinesRes,
    announcementsRes,
    tasksRes,
    myAssigneesRes,
    reimbsRes,
    budgetsRes,
    photosRes,
    pnmRes,
    tripsRes,
    waiversRes,
    tryoutsRes,
    clubMembershipRes,
    clubServiceRes,
    allEventsRes,
    pastEventsRes,
    recentPhotosRes,
    recentAnnouncementsRes,
  ] = await Promise.all([
    supabase
      .from("member_profiles")
      .select(
        "id, full_name, membership_status, payment_status, attendance_rate, forms_completed, forms_required, created_at, is_injured, user_id",
      )
      .eq("org_id", orgId),
    supabase
      .from("member_profiles")
      .select(
        "id, full_name, membership_status, payment_status, attendance_rate, forms_completed, forms_required, created_at, is_injured",
      )
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("events")
      .select("id, title, type, starts_at, location, status")
      .eq("org_id", orgId)
      .gte("starts_at", nowIso)
      .order("starts_at")
      .limit(5),
    supabase.from("payments").select("amount, paid_amount, status, due_date").eq("org_id", orgId),
    supabase
      .from("payments")
      .select("id, amount, paid_amount, status, due_date, payment_items(title)")
      .eq("org_id", orgId),
    supabase
      .from("announcements")
      .select("id, title, body, author_name, created_at, pinned")
      .eq("org_id", orgId)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("tasks")
      .select("id, title, status, priority, due_date, assignee_name, assigned_to")
      .eq("org_id", orgId)
      .neq("status", "done")
      .neq("status", "cancelled")
      .order("due_date", { ascending: true })
      .limit(8),
    supabase.from("task_assignees").select("task_id").eq("user_id", userId),
    supabase.from("reimbursements").select("id, amount, status, created_at").eq("org_id", orgId),
    supabase
      .from("budgets")
      .select("*, budget_lines(*)")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("photos")
      .select("id, url, storage_path, caption, uploader_name, created_at, status")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(4),
    isGreekOrg(orgType)
      ? supabase.from("pnm_leads").select("status").eq("org_id", orgId)
      : Promise.resolve({ data: [] }),
    isSportsOrg(orgType)
      ? supabase.from("sports_travel_trips").select("id, title, status").eq("org_id", orgId).limit(3)
      : Promise.resolve({ data: [] }),
    isSportsOrg(orgType)
      ? supabase
          .from("sports_waivers")
          .select("status, waiver_type, member_id")
          .eq("org_id", orgId)
      : Promise.resolve({ data: [] }),
    isSportsOrg(orgType)
      ? supabase.from("sports_tryouts").select("id, status").eq("org_id", orgId)
      : Promise.resolve({ data: [] }),
    isClubOrg(orgType)
      ? supabase.from("club_membership_applications").select("id, status").eq("org_id", orgId)
      : Promise.resolve({ data: [] }),
    isClubOrg(orgType)
      ? supabase.from("club_service_hours").select("hours, verified").eq("org_id", orgId)
      : Promise.resolve({ data: [] }),
    supabase.from("events").select("id").eq("org_id", orgId),
    supabase
      .from("events")
      .select("id, title, starts_at")
      .eq("org_id", orgId)
      .lt("starts_at", nowIso)
      .order("starts_at", { ascending: false })
      .limit(8),
    supabase
      .from("photos")
      .select("created_at")
      .eq("org_id", orgId)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false })
      .limit(400),
    supabase
      .from("announcements")
      .select("created_at")
      .eq("org_id", orgId)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const members = (membersRes.data ?? []) as MemberProfile[];
  const events = (eventsRes.data ?? []) as Event[];
  const payments = (paymentsRes.data ?? []) as Payment[];
  const announcements = (announcementsRes.data ?? []) as Announcement[];
  const tasks = (tasksRes.data ?? []) as Task[];
  const assigneeTaskIds = new Set(
    ((myAssigneesRes.data ?? []) as Array<{ task_id: string }>).map((r) => String(r.task_id)),
  );
  let myTasks = tasks.filter(
    (t) =>
      (t as Task & { assigned_to?: string }).assigned_to === userId ||
      assigneeTaskIds.has(t.id),
  );
  const missingIds = [...assigneeTaskIds].filter((id) => !myTasks.some((t) => t.id === id));
  if (missingIds.length > 0) {
    const { data: extraTasks } = await supabase
      .from("tasks")
      .select("id, title, status, priority, due_date, assignee_name, assigned_to")
      .eq("org_id", orgId)
      .in("id", missingIds)
      .neq("status", "done")
      .neq("status", "cancelled");
    myTasks = [...myTasks, ...((extraTasks ?? []) as Task[])];
    myTasks.sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
    myTasks = myTasks.slice(0, 6);
  }

  const reimbs = (reimbsRes.data ?? []) as DashboardData["reimbs"];
  const budgets = (budgetsRes.data ?? []) as DashboardData["budgets"];
  const photosRaw = (photosRes.data ?? []) as Array<Record<string, unknown>>;
  const photosResolved = await attachPhotoDisplayUrls(
    supabase,
    photosRaw as Array<{ url?: string; storage_path?: string }>,
  );
  const photos = photosResolved.map((p) => ({
    ...p,
    url: p.display_url ?? p.url,
  })) as Array<Record<string, unknown>>;
  const pnmLeads = (pnmRes.data ?? []) as Array<{ status: string }>;
  const sportsTrips = (tripsRes.data ?? []) as DashboardData["sportsTrips"];
  const waivers = (waiversRes.data ?? []) as DashboardData["waivers"];
  const sportsTryouts = (tryoutsRes.data ?? []) as DashboardData["sportsTryouts"];
  const clubApplications = (clubMembershipRes.data ?? []) as DashboardData["clubApplications"];
  const clubHours = (clubServiceRes.data ?? []) as DashboardData["clubHours"];
  const myProfile = (myProfileRes.data ?? null) as MemberProfile | null;

  const allEventIds = ((allEventsRes.data ?? []) as Array<{ id: string }>).map((e) => e.id);
  const pastEvents = (pastEventsRes.data ?? []) as Array<{
    id: string;
    title: string;
    starts_at: string;
  }>;
  const recentPhotos = (recentPhotosRes.data ?? []) as Array<{ created_at: string }>;
  const recentAnnouncements = (recentAnnouncementsRes.data ?? []) as Array<{ created_at: string }>;

  let rsvps: Array<{ checked_in: boolean; event_id: string }> = [];
  if (allEventIds.length > 0) {
    const { data: rsvpData } = await supabase
      .from("event_rsvps")
      .select("checked_in, event_id")
      .in("event_id", allEventIds);
    rsvps = (rsvpData ?? []) as typeof rsvps;
  }

  const pastEventIds = pastEvents.map((e) => e.id);
  let pastRsvps: Array<{ checked_in: boolean; event_id: string }> = [];
  if (pastEventIds.length > 0) {
    const { data: rsvpData } = await supabase
      .from("event_rsvps")
      .select("checked_in, event_id")
      .in("event_id", pastEventIds);
    pastRsvps = (rsvpData ?? []) as typeof pastRsvps;
  }

  const attendanceTrend = buildAttendanceTrend(pastEvents, pastRsvps);
  const engagementTrend = buildEngagementTrend(recentPhotos, recentAnnouncements);

  const paymentRows = (paymentDeadlinesRes.data ?? []) as Parameters<
    typeof buildDeadlineItems
  >[1];
  const deadlineItems = buildDeadlineItems(tasks, paymentRows, members);

  const activeCount = members.filter((m) => m.membership_status === "active").length;
  const newMembers = members.filter(
    (m) =>
      m.membership_status === "new_member" ||
      (m.created_at && new Date(m.created_at) > new Date(thirtyDaysAgo)),
  ).length;
  const alumniCount = members.filter((m) => m.membership_status === "alumni").length;

  const totalExpected = payments.reduce((s, p) => s + Number(p.amount), 0);
  const totalCollected = payments.reduce((s, p) => s + Number(p.paid_amount), 0);
  const collectionRate =
    totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
  const overdueCount = payments.filter((p) => p.status === "overdue").length;
  const unpaidMembers = members.filter((m) => m.payment_status !== "current").length;

  const pendingReimbs = reimbs.filter((r) => ["submitted", "needs_info"].includes(r.status));
  const pendingReimbAmount = pendingReimbs.reduce((s, r) => s + Number(r.amount), 0);

  const budgetLines = budgets[0]?.budget_lines ?? [];
  const expenseLines = budgetLines.filter((l) => l.type === "expense");
  const budgetUsed = expenseLines.reduce((s, l) => s + Number(l.actual), 0);
  const budgetTotal = expenseLines.reduce((s, l) => s + Number(l.budgeted), 0);
  const budgetPct = budgetTotal > 0 ? Math.round((budgetUsed / budgetTotal) * 100) : 0;

  const formsIncomplete = members.filter(
    (m) => m.forms_required > 0 && m.forms_completed < m.forms_required,
  ).length;

  const avgAttendance =
    members.length > 0
      ? Math.round(members.reduce((s, m) => s + m.attendance_rate, 0) / members.length)
      : 0;

  const { breakdown, composite, metricsUsed } = computeHealthScore({
    members: members.map((m) => ({
      membership_status: m.membership_status,
      payment_status: m.payment_status,
      attendance_rate: m.attendance_rate,
      forms_completed: m.forms_completed,
      forms_required: m.forms_required,
    })),
    payments: payments.map((p) => ({
      amount: p.amount,
      paid_amount: p.paid_amount,
      status: p.status,
    })),
    pnmLeads,
    events: events.map((e) => ({ id: e.id })),
    rsvps,
    tasks: tasks.map((t) => ({ status: t.status })),
    reimbursements: reimbs,
    budgets,
    waivers: isSportsOrg(orgType) ? waivers : undefined,
    orgType,
  });

  const tasksDue = tasks.filter(
    (t) => t.due_date && new Date(t.due_date) <= new Date(Date.now() + 3 * 86400000),
  ).length;

  const complianceIssues = formsIncomplete + overdueCount + pendingReimbs.length;
  const totalClubHours = clubHours.reduce((s, h) => s + Number(h.hours), 0);

  const setupSteps = buildSetupSteps(
    members,
    allEventIds.length,
    payments,
    announcements,
    budgets,
  );

  return {
    members,
    events,
    payments,
    announcements,
    tasks,
    myTasks,
    myProfile,
    reimbs,
    budgets,
    photos,
    pnmLeads,
    sportsTrips,
    waivers,
    sportsTryouts,
    clubApplications,
    clubHours,
    rsvps,
    attendanceTrend,
    engagementTrend,
    deadlineItems,
    setupSteps,
    stats: {
      activeCount,
      newMembers,
      alumniCount,
      totalExpected,
      totalCollected,
      collectionRate,
      overdueCount,
      unpaidMembers,
      pendingReimbs: pendingReimbs.length,
      pendingReimbAmount,
      budgetUsed,
      budgetTotal,
      budgetPct,
      formsIncomplete,
      avgAttendance,
      tasksDue,
      complianceIssues,
      complianceOk: complianceIssues === 0,
      totalClubHours,
    },
    health: { breakdown, composite, metricsUsed },
  };
}
