export const BACKUP = [
  { v: "Success", th: "สำเร็จ", tone: "t-ok", hint: "ทุกงานผ่าน" },
  { v: "Failed - Rerun OK", th: "Fail แล้วรันซ้ำผ่าน", tone: "t-warn", hint: "ระบุงานที่ fail" },
  { v: "Failed", th: "Fail", tone: "t-bad", hint: "ต้องแก้ไข / แจ้งงาน" },
] as const;

export type WeeklyRow = {
  id: number;
  week_start: string;
  backup: string;
  backup_note: string | null;
  disk_srv: number | null;
  disk_nvr: number | null;
  ad_locked: number | null;
  ad_inactive: number | null;
  unpatched: number | null;
  remark: string | null;
  checker: string;
};

export const LOW_DISK = 20;   // % free below this = plan more space (the workbook's red threshold)
