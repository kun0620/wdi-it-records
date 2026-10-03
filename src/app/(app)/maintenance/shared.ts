export type MaintRow = {
  id: number;
  done_date: string;
  type: string;
  scope: string | null;
  result: "Pass" | "Fail";
  evidence: string | null;
  done_by: string;
  approved_by: string | null;
  approval_date: string | null;
  remark: string | null;
  next_due?: string | null;      // from it.maintenance_v
  updated_at: string;
};

export type MaintType = { name: string; every_months: number };

export const needsSignoff = (type: string) => type.startsWith("Quarterly");

// Same rules as it.dashboard(): next due = last Pass + period; due soon = within 14 days.
export function maintStatus(lastPass: string | null, nextDue: string | null, today: string) {
  if (!lastPass || !nextDue) return { v: "NOT DONE", th: "ยังไม่เคยทำ", tone: "t-bad" };
  if (nextDue < today) return { v: "OVERDUE", th: "เลยกำหนด", tone: "t-bad" };
  if ((Date.parse(nextDue) - Date.parse(today)) / 864e5 <= 14) return { v: "DUE SOON", th: "ใกล้ครบกำหนด", tone: "t-warn" };
  return { v: "OK", th: "ปกติ", tone: "t-ok" };
}

// Like Postgres date + interval 'n months': the day is clamped to the target month (31 Jan + 1 = 28/29 Feb).
export function addMonths(iso: string, months: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(d, last));
  return t.toISOString().slice(0, 10);
}
