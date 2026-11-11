"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isISODate } from "@/lib/dates";
import { CHECKS, RESULTS, incidentHref, type CheckResult } from "./checks";

export type SaveState = { ok?: string; error?: string };

// One row per day: saving the same date again updates that day's row (audit log keeps the old values).
// Per-check NG notes (note_<key>) are folded into the single remark column, one line per check.
// With then=incident the day is saved first, then the officer is taken to a prefilled Incident form.
export async function saveDaily(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const date = formData.get("check_date");
  if (!isISODate(date)) return { error: "วันที่ไม่ถูกต้อง" };

  const checker = String(formData.get("checker") ?? "").trim();
  if (!checker) return { error: "กรุณากรอกผู้ตรวจ" };

  const row: Record<string, string | null> = { check_date: date, checker };
  for (const c of CHECKS) {
    const v = String(formData.get(c.k) ?? "");
    row[c.k] = (RESULTS as readonly string[]).includes(v) ? (v as CheckResult) : null;
  }
  const ngs = CHECKS.filter((c) => row[c.k] === "NG");
  const notes = ngs
    .map((c) => ({ c, note: String(formData.get(`note_${c.k}`) ?? "").trim() }))
    .filter((n) => n.note);
  const general = String(formData.get("remark") ?? "").trim();
  const remark = [...notes.map((n) => `${n.c.name}: ${n.note}`), general].filter(Boolean).join("\n");
  if (!general && notes.length < ngs.length) {
    return { error: "มีรายการ NG — ใส่อาการที่พบในช่องของข้อที่ NG ก่อนบันทึก" };
  }
  row.remark = remark || null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_check")
    .upsert(row, { onConflict: "check_date" })
    .select("complete, ng_count")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/daily");
  revalidatePath("/");

  if (formData.get("then") === "incident" && ngs.length > 0) {
    const ng = ngs.map((c) => ({ k: c.k, name: c.name, note: notes.find((x) => x.c.k === c.k)?.note }));
    redirect(incidentHref(date, checker, ng, general));
  }

  return {
    ok: data.complete === 1
      ? data.ng_count > 0 ? `บันทึกแล้ว ✓ ครบ — พบ NG ${data.ng_count} รายการ` : "บันทึกแล้ว ✓ ครบทุกรายการ"
      : "บันทึกแล้ว (ยังไม่ครบ 7 รายการ)",
  };
}
