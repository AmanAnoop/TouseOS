/** Coaching & captain tools config. */

export const AVAILABILITY_STATUSES = [
  { value: "available", label: "Available", color: "green" as const },
  { value: "questionable", label: "Questionable", color: "yellow" as const },
  { value: "out", label: "Out", color: "red" as const },
] as const;

export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number]["value"];

export const PRACTICE_BLOCKS = [
  { label: "Warm-up", time: "0:00 – 0:15", default: "Dynamic stretching, light jog" },
  { label: "Drills", time: "0:15 – 0:45", default: "Position-specific skill work" },
  { label: "Scrimmage", time: "0:45 – 1:15", default: "Full team practice game" },
  { label: "Cool-down", time: "1:15 – 1:30", default: "Static stretching, team meeting" },
] as const;

export function availabilityLabel(status: string): string {
  return AVAILABILITY_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export function availabilityColor(status: string): "green" | "yellow" | "red" | "gray" {
  return AVAILABILITY_STATUSES.find((s) => s.value === status)?.color ?? "gray";
}
