import ExcelJS from "exceljs";
import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/supabase/server";
import { addDays, isISODate, isoWeek, mondayOf, thDate, todayISO } from "@/lib/dates";
import { CHECKS, recordedLate, type DailyRow } from "../checks";

// Weekly Daily Check report (Mon–Sun of the week containing ?week=, default this week),
// made every Friday. Days without a record are listed as such — nothing is filled in.

const NAVY = "FF1F4E78";
const FILL: Record<string, string> = { OK: "FFE2F0D9", NG: "FFF8D7DA", "N/A": "FFEDEDED" };
const DOW = ["Sun อา.", "Mon จ.", "Tue อ.", "Wed พ.", "Thu พฤ.", "Fri ศ.", "Sat ส."];

export async function GET(request: NextRequest) {
  const w = request.nextUrl.searchParams.get("week");
  const today = todayISO();
  const mon = mondayOf(isISODate(w) ? w : today);
  const sun = addDays(mon, 6);

  const { supabase, role } = await getSession();
  if (!role) return new NextResponse("Forbidden", { status: 403 });
  const { data, error } = await supabase.from("daily_check").select("*").gte("check_date", mon).lte("check_date", sun).order("check_date");
  if (error) return new NextResponse(error.message, { status: 500 });
  const byDate = new Map(((data ?? []) as DailyRow[]).map((r) => [r.check_date, r]));

  const wb = new ExcelJS.Workbook();
  wb.creator = "WDI IT Records";
  wb.created = new Date();
  const ws = wb.addWorksheet("Daily_Check_Week", {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  const cols = [
    { h: "Date\nวันที่", w: 11 }, { h: "Day\nวัน", w: 9 },
    ...CHECKS.map((c) => ({ h: c.th, w: 11 })),
    { h: "Result\nผล", w: 14 }, { h: "NG Detail / Remark\nรายละเอียด NG / หมายเหตุ", w: 40 },
    { h: "Checked By\nผู้ตรวจ", w: 14 }, { h: "Note\nบันทึก", w: 14 },
  ];
  ws.columns = cols.map((c) => ({ width: c.w }));
  ws.getCell("A1").value = `Daily Check Weekly Report · รายงานตรวจเช็คประจำวัน สัปดาห์ที่ ${isoWeek(mon)}`;
  ws.getCell("A1").font = { bold: true, size: 14, color: { argb: NAVY } };
  ws.getCell("A2").value = `${thDate(mon)} – ${thDate(sun)} · ข้อมูล ณ ${thDate(today)}`;
  ws.getCell("A2").font = { size: 10, color: { argb: "FF595959" } };

  const header = ws.getRow(4);
  cols.forEach((c, i) => {
    const cell = header.getCell(i + 1);
    cell.value = c.h;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.alignment = { wrapText: true, vertical: "middle", horizontal: "center" };
  });
  header.height = 32;

  let recorded = 0, complete = 0, ngDays = 0, ngItems = 0, missing = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(mon, i);
    const r = byDate.get(d);
    const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
    const row = ws.getRow(5 + i);
    row.getCell(1).value = new Date(`${d}T00:00:00Z`);
    row.getCell(1).numFmt = "dd/mm/yyyy";
    row.getCell(2).value = DOW[dow];

    if (r) {
      recorded++;
      if (r.complete === 1) complete++;
      if (r.ng_count > 0) { ngDays++; ngItems += r.ng_count; }
      CHECKS.forEach((c, ci) => {
        const cell = row.getCell(3 + ci);
        const v = r[c.k];
        cell.value = v ?? "-";
        cell.alignment = { horizontal: "center" };
        if (v) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL[v] } };
        if (v === "NG") cell.font = { bold: true, color: { argb: "FFA11D1D" } };
      });
      row.getCell(10).value = r.ng_count > 0 ? `NG ${r.ng_count}` : r.complete === 1 ? "ครบ 7/7" : "ไม่ครบ";
      row.getCell(11).value = r.remark;
      row.getCell(12).value = r.checker;
      row.getCell(13).value = recordedLate(r) ? "บันทึกย้อนหลัง" : null;
    } else {
      const future = d > today;
      // Sunday with no record = day off; a passed weekday with no record = missing
      const label = future ? "" : dow === 0 ? "วันหยุด" : "ไม่มีบันทึก";
      if (!future && dow !== 0) missing++;
      ws.mergeCells(5 + i, 3, 5 + i, 10);
      row.getCell(3).value = label;
      row.getCell(3).alignment = { horizontal: "center" };
      row.getCell(3).font = { italic: true, color: { argb: "FF7F7F7F" } };
    }
    row.eachCell({ includeEmpty: true }, (cell, n) => {
      if (n <= cols.length) cell.border = { bottom: { style: "thin", color: { argb: "FFD9D9D9" } } };
      if (n === 11) cell.alignment = { wrapText: true, vertical: "top" };
    });
  }

  const s = 5 + 7 + 1;
  const summary: [string, string | number][] = [
    ["วันที่มีบันทึก", recorded],
    ["ครบ 7/7", complete],
    ["วันที่พบ NG / จำนวนข้อ NG", `${ngDays} วัน / ${ngItems} ข้อ`],
    ["วันทำงานที่ไม่มีบันทึก", missing],
  ];
  ws.getCell(s, 1).value = "สรุป · Summary";
  ws.getCell(s, 1).font = { bold: true, color: { argb: NAVY } };
  summary.forEach(([k, v], i) => {
    ws.mergeCells(s + 1 + i, 1, s + 1 + i, 2);
    ws.getCell(s + 1 + i, 1).value = k;
    ws.getCell(s + 1 + i, 3).value = v;
    ws.getCell(s + 1 + i, 3).font = { bold: true };
  });

  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="WDI-DailyCheck_${mon}_W${String(isoWeek(mon)).padStart(2, "0")}.xlsx"`,
    },
  });
}
