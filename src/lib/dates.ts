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
