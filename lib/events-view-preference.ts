const STORAGE_KEY = "touse-events-view";

export type EventsViewMode = "list" | "calendar";

export function getEventsViewPreference(): EventsViewMode {
  if (typeof window === "undefined") return "list";
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "calendar" ? "calendar" : "list";
  } catch {
    return "list";
  }
}

export function setEventsViewPreference(mode: EventsViewMode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignore quota errors
  }
}
