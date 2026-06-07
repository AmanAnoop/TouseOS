export const DASHBOARD_WIDGET_IDS = [
  "stats_primary",
  "stats_secondary",
  "deadlines",
  "health",
  "compliance",
  "attendance_chart",
  "engagement_chart",
  "events",
  "announcements",
  "unpaid",
  "officer_tasks",
  "photos",
  "chapter_links",
] as const;

export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number];

export const DASHBOARD_WIDGET_LABELS: Record<DashboardWidgetId, string> = {
  stats_primary: "Key metrics",
  stats_secondary: "Finance & compliance metrics",
  deadlines: "Upcoming deadlines",
  health: "Health score",
  compliance: "Compliance status",
  attendance_chart: "Attendance trend",
  engagement_chart: "Engagement trend",
  events: "Upcoming events",
  announcements: "Recent announcements",
  unpaid: "Unpaid balances",
  officer_tasks: "Officer tasks",
  photos: "Recent photo activity",
  chapter_links: "Chapter dashboard links",
};

export const DEFAULT_DASHBOARD_LAYOUT: DashboardWidgetId[] = [...DASHBOARD_WIDGET_IDS];

export interface DashboardLayoutPrefs {
  order: DashboardWidgetId[];
  hidden: DashboardWidgetId[];
}

export function normalizeDashboardLayout(raw: unknown, orgId: string): DashboardLayoutPrefs {
  const map = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const org = map[orgId];
  const orderRaw = org && typeof org === "object" ? (org as { order?: unknown; hidden?: unknown }).order : null;
  const hiddenRaw = org && typeof org === "object" ? (org as { order?: unknown; hidden?: unknown }).hidden : null;

  const order = Array.isArray(orderRaw)
    ? orderRaw.filter((id): id is DashboardWidgetId => DASHBOARD_WIDGET_IDS.includes(id as DashboardWidgetId))
    : [];
  const hidden = Array.isArray(hiddenRaw)
    ? hiddenRaw.filter((id): id is DashboardWidgetId => DASHBOARD_WIDGET_IDS.includes(id as DashboardWidgetId))
    : [];

  const mergedOrder = [...order];
  for (const id of DEFAULT_DASHBOARD_LAYOUT) {
    if (!mergedOrder.includes(id)) mergedOrder.push(id);
  }

  return { order: mergedOrder, hidden };
}

export function visibleDashboardWidgets(prefs: DashboardLayoutPrefs): DashboardWidgetId[] {
  return prefs.order.filter((id) => !prefs.hidden.includes(id));
}
