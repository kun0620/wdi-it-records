"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isISODate } from "@/lib/dates";
import { ASSET_STATUSES } from "./shared";

export type SaveState = { error?: string };

const TEXT = ["serial", "name", "model", "category", "manufacturer", "user_name", "position", "department", "location",
  "ip_address", "mac", "vendor", "remark"] as const;

export async function saveAsset(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const id = Number(formData.get("id")) || null;
  const row: Record<string, string | number | null> = {};
  for (const k of TEXT) row[k] = String(formData.get(k) ?? "").trim() || null;

  const status = String(formData.get("status") ?? "");
  if (!ASSET_STATUSES.some((s) => s.v === status)) return { error: "กรุณาเลือกสถานะ" };
  row.status = status;
  if (!row.name && !row.model) return { error: "กรุณากรอกชื่อหรือรุ่นอย่างน้อย 1 ช่อง" };
  if (!row.category) return { error: "กรุณากรอกประเภท (ใช้กำหนดตัวย่อของ Asset Tag)" };

  for (const k of ["purchase_date", "warranty_end"]) {
    const v = formData.get(k);
    row[k] = isISODate(v) ? v : null;
  }
  if (row.purchase_date && row.warranty_end && row.warranty_end < row.purchase_date) {
    return { error: "วันหมดประกันต้องไม่ก่อนวันที่ซื้อ" };
  }
  const price = String(formData.get("price") ?? "").replace(/,/g, "").trim();
  if (price && !(Number(price) >= 0)) return { error: "ราคาไม่ถูกต้อง" };
  row.price = price ? Number(price) : null;

  const supabase = await createClient();
  let savedId = id;
  if (id) {
    // Optimistic lock on updated_at, like Service Log.
    const { data, error } = await supabase
      .from("assets").update(row)
      .eq("id", id).eq("updated_at", String(formData.get("updated_at")))
      .select("id");
    if (error) return { error: error.message };
    if (!data?.length) return { error: "รายการนี้ถูกแก้ไขจากที่อื่นแล้ว — กรุณาเปิดใหม่" };
  } else {
    const { data, error } = await supabase.from("assets").insert(row).select("id").single();
    if (error) return { error: error.message };
    savedId = data.id;
  }

  revalidatePath("/assets");
  revalidatePath("/");
  redirect(`/assets/${savedId}?saved=1`);
}
