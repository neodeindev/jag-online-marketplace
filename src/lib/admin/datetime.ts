/**
 * Converting between stored timestamps and <input type="datetime-local">
 * values in the store's timezone, so schedules mean the same thing no matter
 * where the person editing is (or where the server runs).
 */

function zonedParts(ms: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** "2026-10-19T14:30" in the store's timezone, or "" for no value. */
export function toZonedInput(iso: string | null | undefined, timeZone: string): string {
  if (!iso) return "";
  const p = zonedParts(new Date(iso).getTime(), timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** Parses a datetime-local value as store time and returns an ISO timestamp (or null). */
export function fromZonedInput(value: string | null | undefined, timeZone: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value ?? "");
  if (!match) return null;
  const [, y, m, d, hh, mm] = match.map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const p = zonedParts(guess, timeZone);
  const offset = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - guess;
  return new Date(guess - offset).toISOString();
}

/** Names used by the catalog forms (same behaviour). */
export const isoToZonedInput = toZonedInput;
export const zonedInputToIso = fromZonedInput;
