import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

export const TICKET_WINDOW_MS = 2000;

export function ticketTimeWindow(now = Date.now()): number {
  return Math.floor(now / TICKET_WINDOW_MS);
}

function ticketSecret(): string {
  return (
    process.env.TICKET_HMAC_SECRET
    ?? process.env.CRON_SECRET
    ?? "touseos-dev-ticket-secret"
  );
}

function signPayload(payload: string): string {
  return createHmac("sha256", ticketSecret()).update(payload).digest("base64url");
}

/** Rotating member ticket: encodes user + event + 2s window. */
export function createRotatingTicketToken(userId: string, eventId: string, window?: number): string {
  const w = window ?? ticketTimeWindow();
  const payload = `${userId}:${eventId}:${w}`;
  return `${Buffer.from(payload).toString("base64url")}.${signPayload(payload)}`;
}

export function verifyRotatingTicketToken(
  token: string,
  graceWindows = 1,
): { valid: boolean; userId?: string; eventId?: string; window?: number; reason?: string } {
  const parts = token.split(".");
  if (parts.length !== 2) return { valid: false, reason: "invalid_format" };

  let payload: string;
  try {
    payload = Buffer.from(parts[0], "base64url").toString("utf8");
  } catch {
    return { valid: false, reason: "invalid_format" };
  }

  const expectedSig = signPayload(payload);
  const sigBuf = Buffer.from(parts[1]);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false, reason: "bad_signature" };
  }

  const segments = payload.split(":");
  if (segments.length < 3) return { valid: false, reason: "invalid_format" };

  const w = parseInt(segments[segments.length - 1], 10);
  const eventId = segments[segments.length - 2];
  const userId = segments.slice(0, -2).join(":");

  if (!userId || !eventId || !Number.isFinite(w)) {
    return { valid: false, reason: "invalid_format" };
  }

  const now = ticketTimeWindow();
  if (Math.abs(now - w) > graceWindows) {
    return { valid: false, reason: "expired", userId, eventId, window: w };
  }

  return { valid: true, userId, eventId, window: w };
}

/** Long-lived chapter check-in code (rotates every 5 minutes). */
export function createChapterCheckInToken(eventId: string, window?: number): string {
  const w = window ?? Math.floor(Date.now() / (5 * 60 * 1000));
  const payload = `chapter:${eventId}:${w}`;
  return `${Buffer.from(payload).toString("base64url")}.${signPayload(payload)}`;
}

export function verifyChapterCheckInToken(
  token: string,
  eventId: string,
  graceWindows = 1,
): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  let payload: string;
  try {
    payload = Buffer.from(parts[0], "base64url").toString("utf8");
  } catch {
    return false;
  }

  const expectedSig = signPayload(payload);
  const sigBuf = Buffer.from(parts[1]);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return false;

  const expected = `chapter:${eventId}:`;
  if (!payload.startsWith(expected)) return false;

  const w = parseInt(payload.slice(expected.length), 10);
  if (!Number.isFinite(w)) return false;

  const now = Math.floor(Date.now() / (5 * 60 * 1000));
  return Math.abs(now - w) <= graceWindows;
}
