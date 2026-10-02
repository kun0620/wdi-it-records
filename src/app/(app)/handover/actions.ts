"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isISODate } from "@/lib/dates";

export type SaveState = { error?: string };

// DB trigger messages -> Thai
function explain(msg: string): string {
  let m: RegExpMatchArray | null;
  if ((m = msg.match(/^(\S+) is still with (.+) — record a Return first/))) return `${m[1]} ยังอยู่กับ ${m[2]} — ต้องบันทึกรับคืนก่อน`;
  if ((m = msg.match(/^(\S+) is not issued to anyone/))) return `${m[1]} ไม่ได้ส่งมอบให้ใครอยู่ จึงรับคืนไม่ได้`;
  if ((m = msg.match(/^(.+) has status (\S+) and cannot be handed over/))) return `${m[1]} มีสถานะ ${m[2]} — ส่งมอบ/รับคืนไม่ได้`;
  return msg;
}

export async function saveHandover(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const assetId = Number(get("asset_id"));
  const action = get("action");
  const date = get("h_date");
  if (!assetId) return { error: "กรุณาเลือกทรัพย์สิน" };
  if (action !== "Issue" && action !== "Return") return { error: "กรุณาเลือก ส่งมอบ หรือ รับคืน" };
  if (!isISODate(date)) return { error: "วันที่ไม่ถูกต้อง" };
  if (!get("user_name")) return { error: "กรุณากรอกชื่อผู้รับ/ผู้คืน" };

  const supabase = await createClient();
  const { error } = await supabase.from("handover").insert({
    asset_id: assetId,
    asset_key: "-",                       // replaced by the asset tag in the DB trigger
    action,
    h_date: date,
    user_name: get("user_name"),
    dept: get("dept") || null,
    condition: get("condition") || null,
    form_ref: get("form_ref") || null,
    remark: get("remark") || null,
  });
  if (error) return { error: explain(error.message) };

  revalidatePath("/handover");
  revalidatePath("/assets");
  redirect(`/assets/${assetId}?handover=${action}`);
}
