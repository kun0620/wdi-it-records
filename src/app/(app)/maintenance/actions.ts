"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isISODate } from "@/lib/dates";

export type SaveState = { error?: string };

export async function saveMaint(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const id = Number(get("id")) || null;
  const done = get("done_date");
  if (!isISODate(done)) return { error: "กรุณากรอกวันที่ทำ" };
  if (!get("type")) return { error: "กรุณาเลือกประเภท" };
  if (get("result") !== "Pass" && get("result") !== "Fail") return { error: "กรุณาเลือกผล Pass / Fail" };
  if (!get("done_by")) return { error: "กรุณากรอกผู้ทำ" };
  const approvalDate = get("approval_date");
  if (approvalDate && !isISODate(approvalDate)) return { error: "วันที่รับรองไม่ถูกต้อง" };
  if (approvalDate && approvalDate < done) return { error: "วันที่รับรองต้องไม่ก่อนวันที่ทำ" };
  if (approvalDate && !get("approved_by")) return { error: "มีวันที่รับรอง แต่ยังไม่ได้ใส่ชื่อผู้รับรอง" };

  const row = {
    done_date: done,
    type: get("type"),
    result: get("result"),
    done_by: get("done_by"),
    scope: get("scope") || null,
    evidence: get("evidence") || null,
    approved_by: get("approved_by") || null,
    approval_date: approvalDate || null,
    remark: get("remark") || null,
  };

  const supabase = await createClient();
  let savedId = id;
  if (id) {
    // optimistic lock, like the other forms
    const { data, error } = await supabase.from("maintenance").update(row).eq("id", id).eq("updated_at", get("updated_at")).select("id");
    if (error) return { error: error.message };
    if (!data?.length) return { error: "รายการนี้ถูกแก้ไขจากที่อื่นแล้ว — กรุณาเปิดใหม่" };
  } else {
    const { data, error } = await supabase.from("maintenance").insert(row).select("id").single();
    if (error) return { error: error.message };
    savedId = data.id;
  }
  revalidatePath("/maintenance");
  revalidatePath("/");
  redirect(`/maintenance?saved=${savedId}`);
}
