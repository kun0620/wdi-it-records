"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isISODate } from "@/lib/dates";

export type SaveState = { error?: string };

const TEXT_FIELDS = ["requester", "dept", "type", "system", "detail", "priority", "action", "status", "escalation", "esc_ref"] as const;
const REQUIRED: Record<string, string> = { requester: "ผู้แจ้ง", type: "ประเภท", priority: "ความสำคัญ", status: "สถานะ" };

function time(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return /^\d{2}:\d{2}(:\d{2})?$/.test(s) ? s : null;
}

export async function saveService(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const id = Number(formData.get("id")) || null;
  const reqDate = formData.get("req_date");
  if (!isISODate(reqDate)) return { error: "กรุณากรอกวันที่แจ้ง" };

  const row: Record<string, string | null> = { req_date: reqDate, req_time: time(formData.get("req_time")) };
  for (const k of TEXT_FIELDS) row[k] = String(formData.get(k) ?? "").trim() || null;
  for (const [k, label] of Object.entries(REQUIRED)) if (!row[k]) return { error: `กรุณากรอก: ${label}` };

  const closeDate = formData.get("close_date");
  row.close_date = isISODate(closeDate) ? closeDate : null;
  row.close_time = time(formData.get("close_time"));
  if (row.status === "Closed" && !row.close_date) return { error: "ปิดงานต้องมีวันที่ปิดงาน" };
  if (row.close_date && row.close_date < reqDate) return { error: "วันที่ปิดงานต้องไม่ก่อนวันที่แจ้ง" };

  const supabase = await createClient();
  let savedId = id;
  if (id) {
    // Optimistic lock: only update if nobody changed the row since this form was opened.
    const { data, error } = await supabase
      .from("service_log").update(row)
      .eq("id", id).eq("updated_at", String(formData.get("updated_at")))
      .select("id");
    if (error) return { error: error.message };
    if (!data?.length) return { error: "รายการนี้ถูกแก้ไขจากที่อื่นแล้ว — กรุณาเปิดใหม่" };
  } else {
    const { data, error } = await supabase.from("service_log").insert(row).select("id").single();
    if (error) return { error: error.message };
    savedId = data.id;
  }

  revalidatePath("/service");
  revalidatePath("/");
  redirect(`/service?saved=${savedId}`);
}
