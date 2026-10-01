// Business dates are Thai local dates (the factory's day), not UTC.
const TZ = "Asia/Bangkok";

export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date()); // yyyy-mm-dd
}

export function isISODate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

// yyyy-mm-dd -> dd/mm/yyyy
export function thDate(s: string | null | undefined): string {
  if (!s || !isISODate(s)) return s ?? "";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

// Current Thai local time as HH:MM
export function nowHHMM(): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
}

// Whole days between two yyyy-mm-dd dates (b - a)
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
}
