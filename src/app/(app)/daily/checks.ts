import { thDate } from "@/lib/dates";
import { CHECK_SYSTEM } from "../service/shared";

// The 7 daily infrastructure checks (columns of it.daily_check).
// `name` is the one label used in the app (Dashboard strip, Daily rows, remarks, incidents);
// `th` is the legacy workbook column header, kept for the Excel report.
export const CHECKS = [
  { k: "firewall", name: "Firewall", th: "Firewall / Log", hint: "ไฟร์วอลล์ และ log ผิดปกติ" },
  { k: "wan", name: "WAN", th: "WAN / Internet", hint: "อินเทอร์เน็ตทุกลิงก์" },
  { k: "vpn", name: "VPN", th: "VPN ไป HQ", hint: "VPN to HQ Suzhou" },
  { k: "core_switch", name: "Core SW", th: "Core Switch", hint: "H3C S7003X IRF" },
  { k: "wifi", name: "Wi-Fi", th: "Wi-Fi AP", hint: "จุดกระจายสัญญาณทั้งหมด" },
  { k: "cctv", name: "CCTV", th: "CCTV → NVR", hint: "กล้องบันทึกลง NVR ครบ" },
  { k: "ups", name: "UPS", th: "UPS", hint: "สถานะแบตเตอรี่/โหลด" },
] as const;

export type CheckKey = (typeof CHECKS)[number]["k"];
export const RESULTS = ["OK", "NG", "N/A"] as const;
export type CheckResult = (typeof RESULTS)[number];

export type DailyRow = {
  check_date: string;
  remark: string | null;
  checker: string;
  complete: number;
  ng_count: number;
  created_at: string;
  updated_at: string;
} & Record<CheckKey, CheckResult | null>;

// Prefilled "new Incident" link for a day with NG results.
export function incidentHref(date: string, checker: string, ng: { k: CheckKey; name: string; note?: string }[], remark: string) {
  const what = ng.map((c) => (c.note ? `${c.name} (${c.note})` : c.name));
  const params = new URLSearchParams({
    type: "Incident",
    system: CHECK_SYSTEM[ng[0].k],
    priority: "P2",
    requester: checker,
    detail: `Daily Check ${thDate(date)} NG: ${what.join(", ")}${remark ? ` — ${remark}` : ""}`,
  });
  return `/service/new?${params}`;
}

// Saved on a later day than the check date (forgot to record on the day) — shown as "บันทึกย้อนหลัง".
export const recordedLate = (r: Pick<DailyRow, "check_date" | "created_at">) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date(r.created_at)) > r.check_date;
