"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isISODate } from "@/lib/dates";
import { DOC_STATUSES } from "./shared";

export type SaveState = { error?: string };

// Rule carried over from the workbook: a new revision that becomes Active retires the older
// Active / Under Revision revisions of the same document (status Obsolete; nothing is deleted).
export async function saveDoc(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const id = Number(get("id")) || null;
  const docNo = get("doc_no").toUpperCase();
  const rev = get("rev");
  const status = get("status");
  if (!docNo) return { error: "กรุณากรอกเลขที่เอกสาร" };
  if (!rev) return { error: "กรุณากรอก Rev." };
  if (!get("title_en")) return { error: "กรุณากรอกชื่อเอกสาร (EN)" };
  if (!DOC_STATUSES.some((s) => s.v === status)) return { error: "กรุณาเลือกสถานะ" };
  const effective = get("effective");
  if (effective && !isISODate(effective)) return { error: "วันที่มีผลไม่ถูกต้อง" };
  if (status === "Active" && !effective) return { error: "เอกสารที่ใช้งาน (Active) ต้องมีวันที่มีผล" };

  const row = {
    doc_no: docNo, rev, status,
    title_en: get("title_en"),
    title_th: get("title_th") || null,
    title_cn: get("title_cn") || null,
    effective: effective || null,
    prepared_by: get("prepared_by") || null,
    approved_by: get("approved_by") || null,
    remark: get("remark") || null,
  };

  const supabase = await createClient();
  let savedId = id;
  if (id) {
    const { data, error } = await supabase.from("documents").update(row).eq("id", id).eq("updated_at", get("updated_at")).select("id");
    if (error) return { error: error.message.includes("documents_doc_no_rev_key") ? `${docNo} Rev. ${rev} มีอยู่แล้ว` : error.message };
    if (!data?.length) return { error: "รายการนี้ถูกแก้ไขจากที่อื่นแล้ว — กรุณาเปิดใหม่" };
  } else {
    const { data, error } = await supabase.from("documents").insert(row).select("id").single();
    if (error) return { error: error.message.includes("documents_doc_no_rev_key") ? `${docNo} Rev. ${rev} มีอยู่แล้ว` : error.message };
    savedId = data.id;
  }

  if (status === "Active" && formData.get("retire_old") === "on") {
    const { error } = await supabase.from("documents").update({ status: "Obsolete" })
      .eq("doc_no", docNo).neq("id", savedId!).in("status", ["Active", "Under Revision"]);
    if (error) return { error: `บันทึกแล้ว แต่ตั้งฉบับเก่าเป็น Obsolete ไม่สำเร็จ: ${error.message}` };
  }

  revalidatePath("/documents");
  redirect(`/documents?saved=${savedId}`);
}
