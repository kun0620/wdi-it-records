import ExcelJS from "exceljs";
import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/supabase/server";
import { todayISO } from "@/lib/dates";
import { ASSET_STATUSES, PREFIXES, statusOf, type AssetRow } from "../shared";

// Asset register as a real Excel Table (header filters, banded rows, totals),
// plus a type × status summary and the handover history.
// Filters (type / status / q) follow the list page; with no status, every status is exported.

const NAVY = "FF1F4E78";
const STATUS_FILL: Record<string, string> = {
  "In Use": "FFE2F0D9", "In Stock": "FFDDEBF7", Repair: "FFFFF2CC", Retired: "FFEDEDED", Lost: "FFF8D7DA", Planned: "FFE9E1F5",
};

const date = (v: string | null) => (v ? new Date(`${v}T00:00:00Z`) : null);

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  // type / status may repeat (?type=PC&type=NB) or be comma-separated; unknown values are ignored
  const multi = (k: string) => sp.getAll(k).flatMap((v) => v.split(",")).map((v) => v.trim()).filter(Boolean);
  const types = multi("type").filter((t) => PREFIXES.some((p) => p.p === t));
  const statuses = multi("status").filter((s) => ASSET_STATUSES.some((x) => x.v === s));
  const q = sp.get("q")?.trim() ?? "";

  const { supabase, role } = await getSession();
  if (!role) return new NextResponse("Forbidden", { status: 403 });

  let query = supabase.from("assets").select("*").order("asset_tag", { nullsFirst: false }).limit(5000);
  if (statuses.length) query = query.in("status", statuses);
  if (q) {
    const like = `%${q.replace(/[%_,()]/g, " ")}%`;
    query = query.or(["asset_tag", "serial", "name", "model", "user_name", "department", "location", "ip_address", "mac"]
      .map((c) => `${c}.ilike.${like}`).join(","));
  }
  const [{ data, error }, { data: ho }] = await Promise.all([
    query,
    supabase.from("handover_v").select("*").order("h_date", { ascending: false }).order("id", { ascending: false }),
  ]);
  if (error) return new NextResponse(error.message, { status: 500 });
  // type = tag prefix; filtered here so it combines cleanly with the search's OR filter
  const rows = ((data ?? []) as AssetRow[]).filter((r) => !types.length || types.some((t) => r.asset_tag?.startsWith(`WDI-${t}-`)));
  const ids = new Set(rows.map((r) => r.id));
  const handovers = (ho ?? []).filter((h) => ids.has(h.asset_id));
  const today = todayISO();

  const wb = new ExcelJS.Workbook();
  wb.creator = "WDI IT Records";
  wb.created = new Date();

  // ---------------------------------------------------------------- Assets (Excel Table)
  const ws = wb.addWorksheet("Assets", { views: [{ state: "frozen", ySplit: 3, xSplit: 1 }] });
  ws.getCell("A1").value = "ทะเบียนทรัพย์สิน IT · IT Asset Register";
  ws.getCell("A1").font = { bold: true, size: 14, color: { argb: NAVY } };
  const filt = [
    `ประเภท ${types.length ? types.map((t) => PREFIXES.find((p) => p.p === t)!.th).join(", ") : "ทั้งหมด"}`,
    `สถานะ ${statuses.length ? statuses.map((s) => statusOf(s)!.th).join(", ") : "ทั้งหมด"}`,
    q && `ค้นหา "${q}"`,
  ].filter(Boolean).join(" · ");
  ws.getCell("A2").value = `ข้อมูล ณ ${today.split("-").reverse().join("/")} · ${rows.length} รายการ · ${filt}`;
  ws.getCell("A2").font = { italic: true, size: 9, color: { argb: "FF595959" } };

  const cols: { name: string; w: number; get: (r: AssetRow) => ExcelJS.CellValue; fmt?: string }[] = [
    { name: "Asset Tag", w: 14, get: (r) => r.asset_tag },
    { name: "สถานะ", w: 11, get: (r) => statusOf(r.status)?.th ?? r.status },
    { name: "Status", w: 10, get: (r) => r.status },
    { name: "ประเภท", w: 26, get: (r) => r.category },
    { name: "ชื่อ", w: 22, get: (r) => r.name },
    { name: "ยี่ห้อ", w: 12, get: (r) => r.manufacturer },
    { name: "รุ่น", w: 24, get: (r) => r.model },
    { name: "Serial No.", w: 22, get: (r) => r.serial },
    { name: "ผู้ใช้", w: 26, get: (r) => r.user_name },
    { name: "แผนก", w: 10, get: (r) => r.department },
    { name: "ที่ตั้ง", w: 16, get: (r) => r.location },
    { name: "IP Address", w: 15, get: (r) => r.ip_address },
    { name: "MAC", w: 19, get: (r) => r.mac },
    { name: "วันที่ซื้อ", w: 12, get: (r) => date(r.purchase_date), fmt: "dd/mm/yyyy" },
    { name: "หมดประกัน", w: 12, get: (r) => date(r.warranty_end), fmt: "dd/mm/yyyy" },
    { name: "ผู้ขาย", w: 16, get: (r) => r.vendor },
    { name: "ราคา (บาท)", w: 13, get: (r) => (r.price == null ? null : Number(r.price)), fmt: "#,##0.00" },
    { name: "หมายเหตุ", w: 30, get: (r) => r.remark },
    { name: "ชีตต้นทาง", w: 14, get: (r) => r.source_sheet ?? "เพิ่มในระบบ" },
  ];
  ws.columns = cols.map((c) => ({ width: c.w }));

  ws.addTable({
    name: "Assets",
    ref: "A3",
    headerRow: true,
    totalsRow: true,
    style: { theme: "TableStyleMedium2", showRowStripes: true },
    columns: cols.map((c, i) => ({
      name: c.name,
      filterButton: true,
      ...(i === 0 ? { totalsRowLabel: "รวม" } : {}),
      ...(c.name === "Asset Tag" ? {} : c.name === "ราคา (บาท)" ? { totalsRowFunction: "sum" as const } : c.name === "สถานะ" ? { totalsRowFunction: "count" as const } : {}),
    })),
    rows: rows.length ? rows.map((r) => cols.map((c) => c.get(r))) : [cols.map(() => null)],
  });

  // number formats, status colour, expired-warranty highlight
  rows.forEach((r, i) => {
    const row = ws.getRow(4 + i);
    cols.forEach((c, ci) => { if (c.fmt) row.getCell(ci + 1).numFmt = c.fmt; });
    const st = row.getCell(2);
    st.fill = { type: "pattern", pattern: "solid", fgColor: { argb: STATUS_FILL[r.status] ?? "FFFFFFFF" } };
    if (r.warranty_end && r.warranty_end < today && r.status !== "Retired") {
      row.getCell(15).font = { color: { argb: "FFC00000" }, bold: true };
    }
    row.getCell(1).font = { name: "Consolas", bold: true };
  });
  ws.getRow(4 + Math.max(rows.length, 1)).getCell(17).numFmt = "#,##0.00";
  ws.getRow(3).height = 20;

  // ---------------------------------------------------------------- Summary: type × status
  const sum = wb.addWorksheet("Summary");
  sum.getCell("A1").value = "สรุปทรัพย์สินตามประเภทและสถานะ";
  sum.getCell("A1").font = { bold: true, size: 14, color: { argb: NAVY } };
  const allStatuses = ASSET_STATUSES.map((s) => s.v);
  const groups = types.length ? PREFIXES.filter((p) => types.includes(p.p)) : [...PREFIXES, { p: "", th: "ยังไม่มีแท็ก" }];
  const count = (p: string, s: string) =>
    rows.filter((r) => r.status === s && (p ? r.asset_tag?.startsWith(`WDI-${p}-`) : !r.asset_tag)).length;
  sum.columns = [{ width: 22 }, ...allStatuses.map(() => ({ width: 12 })), { width: 10 }];
  sum.addTable({
    name: "Summary",
    ref: "A3",
    totalsRow: true,
    style: { theme: "TableStyleMedium2", showRowStripes: true },
    columns: [
      { name: "ประเภท", totalsRowLabel: "รวม" },
      ...ASSET_STATUSES.map((s) => ({ name: s.th, totalsRowFunction: "sum" as const })),
      { name: "รวม", totalsRowFunction: "sum" as const },
    ],
    rows: groups.map((g) => {
      const n = allStatuses.map((s) => count(g.p, s));
      return [g.p ? `${g.p} · ${g.th}` : g.th, ...n, n.reduce((a, b) => a + b, 0)];
    }),
  });

  // ---------------------------------------------------------------- Handover history
  const hw = wb.addWorksheet("Handover", { views: [{ state: "frozen", ySplit: 1 }] });
  hw.columns = [{ width: 12 }, { width: 10 }, { width: 14 }, { width: 24 }, { width: 26 }, { width: 10 }, { width: 14 }, { width: 14 }, { width: 30 }];
  hw.addTable({
    name: "Handover",
    ref: "A1",
    style: { theme: "TableStyleMedium2", showRowStripes: true },
    columns: ["วันที่", "รับ/คืน", "Asset Tag", "รุ่น", "ผู้รับ/ผู้คืน", "แผนก", "สภาพ", "เลขใบ", "หมายเหตุ"].map((name) => ({ name, filterButton: true })),
    rows: handovers.length
      ? handovers.map((h) => [date(h.h_date), h.action === "Issue" ? "ส่งมอบ" : "รับคืน", h.asset_key, h.model ?? h.category,
          h.user_name, h.dept, h.condition, h.form_ref, h.remark])
      : [[null, null, null, null, null, null, null, null, "ยังไม่มีรายการ"]],
  });
  hw.getColumn(1).numFmt = "dd/mm/yyyy";

  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  const name = `WDI-Assets_${today}${types.length ? `_${types.join("-")}` : ""}${statuses.length ? `_${statuses.map((s) => s.replace(/\s+/g, "")).join("-")}` : ""}.xlsx`;
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
