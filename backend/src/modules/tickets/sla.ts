import type { z } from "zod";
import type { ticketPriority } from "./ticket-rules.js";

export type Priority = z.infer<typeof ticketPriority>;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/**
 * Demo calendar: Monday-Friday, 08:00-18:00 America/Sao_Paulo.
 * No holiday calendar was supplied by the PRD. Production should inject one.
 * Critical priority is 24/7; the others use business time.
 */
const ZONE = "America/Sao_Paulo";
const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

function localParts(date: Date) {
  const p = Object.fromEntries(formatter.formatToParts(date).map((v) => [v.type, v.value]));
  return { weekday: p.weekday, hour: Number(p.hour), minute: Number(p.minute) };
}
function isBusinessMinute(date: Date): boolean {
  const { weekday, hour } = localParts(date);
  return weekday !== "Sat" && weekday !== "Sun" && hour >= 8 && hour < 18;
}

/** Count real elapsed business minutes, respecting DST via UTC iteration. */
export function addBusinessMinutes(start: Date, minutes: number): Date {
  if (!Number.isInteger(minutes) || minutes < 0) throw new RangeError("Invalid business minutes");
  const cursor = new Date(Math.ceil(start.getTime() / 60_000) * 60_000);
  let remaining = minutes;
  // At most five weeks of scanning; maximum SLA is five work days.
  for (let checked = 0; remaining > 0 && checked < 50_000; checked++) {
    if (isBusinessMinute(cursor)) remaining--;
    cursor.setTime(cursor.getTime() + 60_000);
  }
  if (remaining !== 0) throw new Error("Unable to calculate SLA");
  return cursor;
}

export function calculateDueAt(priority: Priority, from: Date): Date {
  switch (priority) {
    case "CRITICAL": return new Date(from.getTime() + HOUR);
    case "HIGH": return addBusinessMinutes(from, 4 * 60);
    case "MEDIUM": return addBusinessMinutes(from, 3 * 10 * 60);
    case "LOW": return addBusinessMinutes(from, 5 * 10 * 60);
  }
}
export function isOverdue(dueAt: Date | null, at: Date = new Date()): boolean {
  return !!dueAt && at.getTime() > dueAt.getTime();
}
export const SLA_POLICY = { critical: "1 elapsed hour (24/7)", high: "4 business hours", medium: "3 business days", low: "5 business days", timezone: ZONE } as const;
