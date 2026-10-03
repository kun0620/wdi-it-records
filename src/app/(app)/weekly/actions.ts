"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isISODate } from "@/lib/dates";
import { BACKUP } from "./shared";

export type SaveState = { ok?: string; error?: string };


// "35", "35%", "0.35" -> 35 ; empty -> null ; out of range -> NaN
function pct(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").replace("%", "").trim();
  if (!s) return null;
  let n = Number(s);
  if (n > 0 && n < 1 && s.includes(".")) n = Math.round(n * 1000) / 10;   // 0.35 typed as a fraction
  return n >= 0 && n <= 100 ? n : NaN;
}
function count(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isInteger(n) && n >= 0 ? n : NaN;
}

// One row per week (Monday); saving the same week again updates it (audit log keeps the old values).
export async function saveWeekly(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const week = formData.get("week_start");
  if (!isISODate(week) || new Date(`${week}T00:00:00Z`).getUTCDay() !== 1) return { error: "สัปดาห์ต้องเริ่มวันจันทร์" };
  const backup = String(formData.get("backup") ?? "");
  if (!BACKUP.some((b) => b.v === backup)) return { error: "กรุณาเลือกสถานะ Backup" };
  const checker = String(formData.get("checker") ?? "").trim();
  if (!checker) return { error: "กรุณากรอกผู้ตรวจ" };
  const backupNote = String(formData.get("backup_note") ?? "").trim();
  if (backup !== "Success" && !backupNote) return { error: "Backup ไม่สำเร็จ — กรุณาระบุงานที่ fail / การรันซ้ำ" };

  const row = {
    week_start: week, backup, checker,
    backup_note: backupNote || null,
    disk_srv: pct(formData.get("disk_srv")),
    disk_nvr: pct(formData.get("disk_nvr")),
    ad_locked: count(formData.get("ad_locked")),
    ad_inactive: count(formData.get("ad_inactive")),
    unpatched: count(formData.get("unpatched")),
    remark: String(formData.get("remark") ?? "").trim() || null,
  };
  if (Number.isNaN(row.disk_srv) || Number.isNaN(row.disk_nvr)) return { error: "% ดิสก์ว่างต้องอยู่ระหว่าง 0–100" };
  if ([row.ad_locked, row.ad_inactive, row.unpatched].some((n) => Number.isNaN(n))) return { error: "จำนวนต้องเป็นเลขจำนวนเต็ม 0 ขึ้นไป" };

  const supabase = await createClient();
  const { error } = await supabase.from("weekly_check").upsert(row, { onConflict: "week_start" });
  if (error) return { error: error.message };
  revalidatePath("/weekly");
  revalidatePath("/");
  return { ok: "บันทึก Weekly Check แล้ว" };
}
