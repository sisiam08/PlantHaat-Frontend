/**
 * Asia/Dhaka date-range helpers for the dashboard period selector. Dhaka has
 * a fixed UTC+06:00 offset (no DST), so calendar boundaries are constructed
 * from explicit offsets and stay stable in tests and on the server.
 */
export type RangePreset = "today" | "7d" | "30d" | "90d" | "custom";

export interface DateRange {
  from: string;
  to: string;
}

const DHARMA_OFFSET = "+06:00";

/** `YYYY-MM-DD` for the Asia/Dhaka calendar day of `date`. */
export function dhakaDateString(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return parts;
}

function shiftDay(day: string, days: number): string {
  const [year, month, date] = day.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, date + days, 12));
  return value.toISOString().slice(0, 10);
}

/** Inclusive Dhaka-day bounds for a preset, as ISO instants for the API. */
export function presetBounds(preset: Exclude<RangePreset, "custom">, now = new Date()): DateRange {
  const today = dhakaDateString(now);
  const days = preset === "today" ? 0 : preset === "7d" ? 6 : preset === "30d" ? 29 : 89;
  const from = shiftDay(today, -days);
  return {
    from: new Date(`${from}T00:00:00.000${DHARMA_OFFSET}`).toISOString(),
    to: new Date(`${today}T23:59:59.999${DHARMA_OFFSET}`).toISOString(),
  };
}

export function customBounds(fromDay: string, toDay: string): DateRange {
  const [from, to] = fromDay <= toDay ? [fromDay, toDay] : [toDay, fromDay];
  return {
    from: new Date(`${from}T00:00:00.000${DHARMA_OFFSET}`).toISOString(),
    to: new Date(`${to}T23:59:59.999${DHARMA_OFFSET}`).toISOString(),
  };
}

/** `YYYY-MM-DD` parts of an ISO instant in Asia/Dhaka (for date inputs). */
export function dhakaInputDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? dhakaDateString() : dhakaDateString(date);
}
