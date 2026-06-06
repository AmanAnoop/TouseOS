import { randomBytes } from "crypto";

export type PnmRsvpStatus = "pending" | "going" | "maybe" | "declined";

export function generatePnmInviteToken(): string {
  return randomBytes(16).toString("hex");
}

export function pnmInviteUrl(token: string, baseUrl?: string): string {
  const base = (baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/pnm-event/${token}`;
}
