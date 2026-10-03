export type DocRow = {
  id: number;
  doc_no: string;
  rev: string;
  title_en: string;
  title_th: string | null;
  title_cn: string | null;
  effective: string | null;
  prepared_by: string | null;
  approved_by: string | null;
  status: DocStatus;
  remark: string | null;
  updated_at: string;
};

export const DOC_STATUSES = [
  { v: "Draft", th: "ร่าง", tone: "t-info" },
  { v: "Active", th: "ใช้งาน", tone: "t-ok" },
  { v: "Under Revision", th: "กำลังแก้ไข", tone: "t-warn" },
  { v: "Obsolete", th: "ยกเลิกแล้ว", tone: "t-grey" },
] as const;
export type DocStatus = (typeof DOC_STATUSES)[number]["v"];
export const docStatus = (v: string) => DOC_STATUSES.find((s) => s.v === v);

// "00" -> "01", "9" -> "10", "A" -> "A1" (non-numeric revs just get a suffix to edit by hand)
export function nextRev(rev: string) {
  return /^\d+$/.test(rev) ? String(Number(rev) + 1).padStart(Math.max(2, rev.length), "0") : `${rev}1`;
}

// Revisions compare numerically when they are numbers ("10" > "09")
export const revCmp = (a: string, b: string) =>
  /^\d+$/.test(a) && /^\d+$/.test(b) ? Number(a) - Number(b) : a.localeCompare(b);
