export const NOTIFICATION_TYPE_OPTIONS = [
  { key: "event_reminder", label: "Event reminders" },
  { key: "payment_reminder", label: "Payment reminders" },
  { key: "task_due", label: "Task due soon" },
  { key: "form_missing", label: "Missing forms" },
  { key: "reimbursement_status", label: "Reimbursement updates" },
  { key: "new_match", label: "GreekMatch activity" },
  { key: "photo_approval", label: "Photo approvals" },
  { key: "general", label: "General announcements" },
] as const;

export type NotificationPrefKey = typeof NOTIFICATION_TYPE_OPTIONS[number]["key"];

export type NotificationPreferences = Record<NotificationPrefKey, boolean>;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  event_reminder: true,
  payment_reminder: true,
  task_due: true,
  form_missing: true,
  reimbursement_status: true,
  new_match: true,
  photo_approval: true,
  general: true,
};

export function parseNotificationPreferences(raw: unknown): NotificationPreferences {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  const obj = raw as Record<string, unknown>;
  const prefs = { ...DEFAULT_NOTIFICATION_PREFERENCES };
  for (const opt of NOTIFICATION_TYPE_OPTIONS) {
    if (typeof obj[opt.key] === "boolean") prefs[opt.key] = obj[opt.key] as boolean;
  }
  return prefs;
}

export function isNotificationTypeEnabled(
  prefs: NotificationPreferences | null | undefined,
  type: string,
): boolean {
  if (!prefs) return true;
  const key = type as NotificationPrefKey;
  if (key in prefs) return Boolean(prefs[key]);
  return true;
}
