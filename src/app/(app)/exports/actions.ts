"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/supabase/server";
import { todayISO } from "@/lib/dates";
import { buildWorkbook, exportPaths } from "@/lib/export/workbook";

export type ExportState = { ok?: string; error?: string };

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// Writes today's file, and refreshes this month's file (so after the last day it is the month-end snapshot).
export async function generateExport(): Promise<ExportState> {
  const { supabase, role } = await getSession();
  if (role !== "editor") return { error: "ต้องเป็น editor" };

  const asOf = todayISO();
  try {
    const file = await buildWorkbook(supabase, asOf);
    const paths = exportPaths(asOf);
    for (const path of [paths.daily, paths.monthly]) {
      const { error } = await supabase.storage.from("it-exports").upload(path, file, { contentType: XLSX, upsert: true });
      if (error) return { error: `อัปโหลด ${path} ไม่สำเร็จ: ${error.message}` };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
  revalidatePath("/exports");
  return { ok: `สร้างไฟล์ของวันที่ ${asOf} แล้ว` };
}
