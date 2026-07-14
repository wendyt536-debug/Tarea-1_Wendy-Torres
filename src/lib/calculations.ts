import type { Intake } from "@/types/intake";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
export const SLA_DAYS = 30;

/**
 * Filters intakes by a date dimension (assignment/received/finishing) and a set of periods.
 * - When periods is empty, all intakes pass through (All Time).
 * - Otherwise intakes must match at least one period (year + month) via the chosen dimension.
 * - Intakes with an empty date string for the chosen dimension are excluded.
 */
export type DateDimension = "assignmentDate" | "receivedDate" | "finishingDate";

export interface Period {
  year: number;
  month: number; // 0-11
}

export function filterIntakesByTime(
  intakes: Intake[],
  dimension: DateDimension,
  periods: Period[] | null | undefined,
): Intake[] {
  // "All Time" — no valid periods means no date filtering at all.
  if (!Array.isArray(periods) || periods.length === 0) return intakes;

  // Guard against malformed period entries (e.g. migrated / stale session data).
  const validPeriods = periods.filter(
    (p): p is Period =>
      !!p &&
      typeof p.year === "number" &&
      typeof p.month === "number" &&
      !Number.isNaN(p.year) &&
      !Number.isNaN(p.month),
  );
  if (validPeriods.length === 0) return intakes;

  const validDimension: DateDimension =
    dimension === "assignmentDate" || dimension === "receivedDate" || dimension === "finishingDate"
      ? dimension
      : "assignmentDate";

  return intakes.filter((i) => {
    const raw = i[validDimension];
    if (!raw) return false;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return false;
    return validPeriods.some((p) => d.getFullYear() === p.year && d.getMonth() === p.month);
  });
}

export function workingDaysBetween(start: string, end: string | Date): number {
  if (!start) return 0;
  const s = new Date(start);
  const e = typeof end === "string" ? new Date(end) : new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0;
  if (e <= s) return 0;

  let count = 0;
  const cursor = new Date(s);
  cursor.setDate(cursor.getDate() + 1);

  while (cursor <= e) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cursor.setDate(cursor.getDate() + 1);
  }

  return count;
}

export function daysBetween(start: string, end: string | Date): number {
  if (!start) return 0;
  const s = new Date(start).getTime();
  const e = typeof end === "string" ? new Date(end).getTime() : end.getTime();
  if (Number.isNaN(s) || Number.isNaN(e)) return 0;
  return Math.max(0, Math.floor((e - s) / MS_PER_DAY));
}

export function computeDaysInProcess(intake: Intake): number {
  const start = intake.receivedDate || intake.assignmentDate;
  if (!start) return 0;
  const end = intake.finishingDate ? new Date(intake.finishingDate) : new Date();
  return workingDaysBetween(start, end);
}

export function computeCompletionTime(intake: Intake): number | null {
  if (!intake.finishingDate) return null;
  const start = intake.receivedDate || intake.assignmentDate;
  if (!start) return null;
  return workingDaysBetween(start, intake.finishingDate);
}

export function isOutOfSLA(intake: Intake): boolean {
  const closed = intake.status === "Published" || intake.status === "Closed" || intake.status === "Completed" || intake.status === "Cancelled";
  if (closed) {
    const ct = computeCompletionTime(intake);
    return ct !== null && ct > SLA_DAYS;
  }
  return computeDaysInProcess(intake) > SLA_DAYS;
}

export function monthLabel(dateIso: string): string {
  if (!dateIso) return "";
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", { month: "short", year: "numeric" });
}

export function yearLabel(dateIso: string): string {
  if (!dateIso) return "";
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return "";
  return String(d.getFullYear());
}

export function formatCurrency(v: number | null): string {
  if (v === null || v === undefined) return "—";
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}