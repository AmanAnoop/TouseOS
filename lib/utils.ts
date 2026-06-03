import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isToday, isTomorrow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, fmt = "MMM d, yyyy") {
  return format(new Date(date), fmt);
}

export function formatDateTime(date: string | Date) {
  const d = new Date(date);
  if (isToday(d)) return `Today at ${format(d, "h:mm a")}`;
  if (isTomorrow(d)) return `Tomorrow at ${format(d, "h:mm a")}`;
  return format(d, "MMM d, h:mm a");
}

export function timeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercent(value: number, decimals = 0) {
  return `${value.toFixed(decimals)}%`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const v = row[h];
          if (v === null || v === undefined) return "";
          const str = String(v);
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(","),
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function uploadFile(
  supabase: ReturnType<
    typeof import("@/lib/supabase/client").createClient
  >,
  bucket: string,
  path: string,
  file: File,
) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    active: "green",
    pending: "yellow",
    paid: "green",
    overdue: "red",
    failed: "red",
    alumni: "blue",
    inactive: "gray",
    removed: "red",
    submitted: "yellow",
    approved: "green",
    rejected: "red",
    going: "green",
    not_going: "red",
    maybe: "yellow",
    lead: "gray",
    contacted: "blue",
    interested: "green",
    high_priority: "purple",
    accepted: "green",
    declined: "red",
  };
  return map[status] ?? "gray";
}

export function orgTypeLabel(type: string): string {
  const map: Record<string, string> = {
    fraternity: "Fraternity",
    sorority: "Sorority",
    club_sports: "Club Sports",
    general_org: "Student Organization",
    university: "University/Admin",
  };
  return map[type] ?? type;
}

export function isGreekOrg(type: string): boolean {
  return type === "fraternity" || type === "sorority";
}

export function isSportsOrg(type: string): boolean {
  return type === "club_sports";
}

export function isClubOrg(type: string): boolean {
  return type === "general_org";
}
