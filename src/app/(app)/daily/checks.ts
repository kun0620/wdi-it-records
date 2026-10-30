// The 7 daily infrastructure checks (columns of it.daily_check).
export const CHECKS = [
  { k: "firewall", th: "Firewall / Log", hint: "ไฟร์วอลล์ และ log ผิดปกติ" },
  { k: "wan", th: "WAN / Internet", hint: "อินเทอร์เน็ตทุกลิงก์" },
  { k: "vpn", th: "VPN ไป HQ", hint: "VPN to HQ Suzhou" },
  { k: "core_switch", th: "Core Switch", hint: "H3C S7003X IRF" },
  { k: "wifi", th: "Wi-Fi AP", hint: "จุดกระจายสัญญาณทั้งหมด" },
  { k: "cctv", th: "CCTV → NVR", hint: "กล้องบันทึกลง NVR ครบ" },
  { k: "ups", th: "UPS", hint: "สถานะแบตเตอรี่/โหลด" },
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
} & Record<CheckKey, CheckResult | null>;

// Saved on a later day than the check date (forgot to record on the day) — shown as "บันทึกย้อนหลัง".
export const recordedLate = (r: Pick<DailyRow, "check_date" | "created_at">) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date(r.created_at)) > r.check_date;
