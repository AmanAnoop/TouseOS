/** Task types per product spec. Stored in tasks.tags as `type:<value>`. */

export const TASK_TYPES = [
  { value: "administrative", label: "Administrative" },
  { value: "financial", label: "Financial" },
  { value: "event_related", label: "Event-Related" },
  { value: "recruitment", label: "Recruitment" },
  { value: "facility", label: "Facility" },
  { value: "other", label: "Other" },
] as const;

export type TaskTypeValue = (typeof TASK_TYPES)[number]["value"];

export function taskTypeFromTags(tags: string[] | null | undefined): TaskTypeValue {
  const hit = (tags ?? []).find((t) => t.startsWith("type:"));
  if (!hit) return "other";
  const val = hit.replace("type:", "") as TaskTypeValue;
  return TASK_TYPES.some((x) => x.value === val) ? val : "other";
}

export function taskTypeLabel(value: TaskTypeValue): string {
  return TASK_TYPES.find((t) => t.value === value)?.label ?? "Other";
}

export function tagsWithType(tags: string[] | undefined, type: TaskTypeValue): string[] {
  const rest = (tags ?? []).filter((t) => !t.startsWith("type:"));
  return [`type:${type}`, ...rest];
}
