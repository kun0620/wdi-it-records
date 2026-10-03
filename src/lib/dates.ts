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

// yyyy-mm-dd -> "วันศุกร์ที่ 3 ตุลาคม 2569" (Thai long date, Buddhist year)
export function longThaiDate(s: string): string {
  return new Intl.DateTimeFormat("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${s}T00:00:00Z`));
}

// yyyy-mm-dd -> "28 ก.ย." (Thai short day + month)
export function shortThaiDate(s: string): string {
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${s}T00:00:00Z`));
}

// yyyy-mm-dd -> "ก.ย." (Thai short month)
export function thaiMonth(s: string): string {
  return new Intl.DateTimeFormat("th-TH", { month: "short", timeZone: "UTC" }).format(new Date(`${s}T00:00:00Z`));
}

// ISO week number of a yyyy-mm-dd date
export function isoWeek(s: string): number {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));       // Thursday of this week
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart) / 864e5 + 1) / 7);
}
