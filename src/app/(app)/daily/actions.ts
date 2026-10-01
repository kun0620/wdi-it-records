"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isISODate } from "@/lib/dates";
import { CHECKS, RESULTS, type CheckResult } from "./checks";

export type SaveState = { ok?: string; error?: string };

// One row per day: saving the same date again updates that day's row (audit log keeps the old values).
export async function saveDaily(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const date = formData.get("check_date");
  if (!isISODate(date)) return { error: "วันที่ไม่ถูกต้อง" };

  const checker = String(formData.get("checker") ?? "").trim();
  const remark = String(formData.get("remark") ?? "").trim();
  if (!checker) return { error: "กรุณากรอกผู้ตรวจ" };

  const row: Record<string, string | null> = { check_date: date, checker, remark: remark || null };
  for (const c of CHECKS) {
    const v = String(formData.get(c.k) ?? "");
    row[c.k] = (RESULTS as readonly string[]).includes(v) ? (v as CheckResult) : null;
  }
  if (CHECKS.some((c) => row[c.k] === "NG") && !remark) {
    return { error: "มีรายการ NG — กรุณาใส่รายละเอียดในหมายเหตุ" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_check")
    .upsert(row, { onConflict: "check_date" })
    .select("complete, ng_count")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/daily");
  return {
    ok: data.complete === 1
      ? data.ng_count > 0 ? `บันทึกแล้ว ✓ ครบ — พบ NG ${data.ng_count} รายการ` : "บันทึกแล้ว ✓ ครบทุกรายการ"
      : "บันทึกแล้ว (ยังไม่ครบ 7 รายการ)",
  };
}
