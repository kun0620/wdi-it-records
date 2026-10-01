import ExcelJS from "exceljs";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Row = Record<string, unknown>;

// Same look as the original "IT Asset & Records" workbook:
// row 1 title, row 2 note, row 3 three-language header (navy), data from row 4.
type Col = { h: string; k: string; w: number; t?: "date" | "time" | "pct" | "num" };
type SheetDef = { name: string; table: string; order: string; title: string; note: string; cols: Col[] };

const NAVY = "FF1F4E78";

const SHEETS: SheetDef[] = [
  {
    name: "Service_Log", table: "service_log", order: "id",
    title: "Service Log – บันทึกคำขอ / แจ้งปัญหา / เหตุขัดข้อง · IT服务记录",
    note: "เลขที่คำขอ = เลขบนใบ WDIT-F-IT-01 (SR-YYYY-###) · ชั่วโมง = เวลาตามปฏิทิน (calendar hours)",
    cols: [
      { h: "Request No.\nเลขที่คำขอ\n申请编号", k: "req_no", w: 14 },
      { h: "Date\nวันที่แจ้ง\n日期", k: "req_date", w: 11, t: "date" },
      { h: "Time\nเวลา\n时间", k: "req_time", w: 8, t: "time" },
      { h: "Requester\nผู้แจ้ง\n申请人", k: "requester", w: 24 },
      { h: "Dept\nแผนก\n部门", k: "dept", w: 9 },
      { h: "Type\nประเภท\n类型", k: "type", w: 15 },
      { h: "System\nระบบ\n系统", k: "system", w: 13 },
      { h: "Description\nรายละเอียด\n问题描述", k: "detail", w: 36 },
      { h: "Priority\nความสำคัญ\n优先级", k: "priority", w: 9 },
      { h: "Action / Solution\nวิธีแก้ไข\n处理方法", k: "action", w: 36 },
      { h: "Status\nสถานะ\n状态", k: "status", w: 15 },
      { h: "Close Date\nวันที่ปิดงาน\n关闭日期", k: "close_date", w: 11, t: "date" },
      { h: "Close Time\nเวลาปิด\n关闭时间", k: "close_time", w: 8, t: "time" },
      { h: "Hours Used\nเวลาที่ใช้ (ชม.)\n用时(小时)", k: "hours", w: 10, t: "num" },
      { h: "Escalated To\nส่งต่อ\n转交", k: "escalation", w: 12 },
      { h: "Escalation Ref / Note\nเลขอ้างอิง/หมายเหตุ\n转交备注", k: "esc_ref", w: 26 },
    ],
  },
  {
    name: "Daily_Check", table: "daily_check", order: "check_date",
    title: "Daily Check – ตรวจเช็คประจำวัน · 每日检查",
    note: "1 แถว = 1 วัน · ครบ = กรอกผลทั้ง 7 รายการ + ผู้ตรวจ · ถ้า NG ให้เปิด Service_Log ประเภท Incident",
    cols: [
      { h: "Date\nวันที่\n日期", k: "check_date", w: 11, t: "date" },
      { h: "Firewall / Log\nไฟร์วอลล์/ล็อก\n防火墙/日志", k: "firewall", w: 11 },
      { h: "WAN / Internet\nอินเทอร์เน็ต\n外网", k: "wan", w: 11 },
      { h: "VPN to HQ\nVPN ไป HQ\n总部VPN", k: "vpn", w: 11 },
      { h: "Core Switch\nสวิตช์หลัก\n核心交换机", k: "core_switch", w: 11 },
      { h: "Wi-Fi AP\nจุดกระจาย Wi-Fi\n无线AP", k: "wifi", w: 11 },
      { h: "CCTV → NVR\nกล้องบันทึกลง NVR\n监控录像", k: "cctv", w: 11 },
      { h: "UPS\nเครื่องสำรองไฟ\n不间断电源", k: "ups", w: 11 },
      { h: "NG Detail / Remark\nรายละเอียด NG / หมายเหตุ\n异常说明", k: "remark", w: 40 },
      { h: "Checked By\nผู้ตรวจ\n检查人", k: "checker", w: 18 },
      { h: "Complete\nครบ (1/0)\n完成", k: "complete", w: 9, t: "num" },
      { h: "NG Count\nจำนวน NG\n异常数", k: "ng_count", w: 9, t: "num" },
    ],
  },
  {
    name: "Weekly_Check", table: "weekly_check", order: "week_start",
    title: "Weekly Check – ตรวจเช็คประจำสัปดาห์ · 每周检查",
    note: "1 แถว = 1 สัปดาห์ (วันจันทร์ของสัปดาห์) · ดิสก์ว่างต่ำกว่า 20% = ต้องวางแผนเพิ่มพื้นที่",
    cols: [
      { h: "Week Start (Mon)\nสัปดาห์เริ่ม (จ.)\n周起始(周一)", k: "week_start", w: 13, t: "date" },
      { h: "Backup Status\nสถานะ Backup\n备份状态", k: "backup", w: 17 },
      { h: "Failed Job / Rerun Note\nงานที่ fail / การรันซ้ำ\n失败任务/重跑", k: "backup_note", w: 30 },
      { h: "Server Disk Free %\nดิสก์ Server ว่าง\n服务器剩余空间", k: "disk_srv", w: 12, t: "pct" },
      { h: "NVR Disk Free %\nดิสก์ NVR ว่าง\nNVR剩余空间", k: "disk_nvr", w: 12, t: "pct" },
      { h: "AD Locked\nAD ถูกล็อก (บัญชี)\nAD锁定账户", k: "ad_locked", w: 11, t: "num" },
      { h: "AD Inactive >90d\nAD ไม่ใช้ >90 วัน\nAD闲置账户", k: "ad_inactive", w: 11, t: "num" },
      { h: "Unpatched PCs\nเครื่องยังไม่ลงแพตช์\n未打补丁电脑", k: "unpatched", w: 11, t: "num" },
      { h: "Action / Remark\nการดำเนินการ / หมายเหตุ\n处理/备注", k: "remark", w: 36 },
      { h: "Checked By\nผู้ตรวจ\n检查人", k: "checker", w: 18 },
    ],
  },
  {
    name: "Maintenance_Records", table: "maintenance_v", order: "done_date",
    title: "Maintenance Records – บันทึกงานบำรุงรักษา · 维护记录",
    note: "Evidence = ที่อยู่ไฟล์ PDF/สแกนที่มีลายเซ็นจริง · รายไตรมาสต้องมีหัวหน้าแผนกเซ็นรับรอง",
    cols: [
      { h: "Date\nวันที่ทำ\n日期", k: "done_date", w: 11, t: "date" },
      { h: "Type\nประเภท\n类型", k: "type", w: 30 },
      { h: "Scope\nขอบเขต\n范围", k: "scope", w: 34 },
      { h: "Result\nผล\n结果", k: "result", w: 9 },
      { h: "Evidence\nหลักฐาน (ไฟล์/ลิงก์)\n证据", k: "evidence", w: 34 },
      { h: "Performed By\nผู้ทำ\n执行人", k: "done_by", w: 18 },
      { h: "Approved By\nผู้รับรอง\n审核人", k: "approved_by", w: 18 },
      { h: "Approval Date\nวันที่รับรอง\n审核日期", k: "approval_date", w: 11, t: "date" },
      { h: "Next Due\nครบกำหนดครั้งถัดไป\n下次到期", k: "next_due", w: 12, t: "date" },
      { h: "Remark\nหมายเหตุ\n备注", k: "remark", w: 30 },
    ],
  },
  {
    name: "Handover_Log", table: "handover_v", order: "h_date",
    title: "Handover Log – บันทึกการรับ-คืนอุปกรณ์ · 资产交接记录",
    note: "Asset Tag (ถ้ายังไม่มีใช้ Serial No.) · \"Not found\" = ยังไม่ได้ลงทะเบียน",
    cols: [
      { h: "Date\nวันที่\n日期", k: "h_date", w: 11, t: "date" },
      { h: "Action\nรับ/คืน\n交接", k: "action", w: 9 },
      { h: "Asset Tag / Serial\nรหัสทรัพย์สิน / S/N\n资产编号/序列号", k: "asset_key", w: 20 },
      { h: "Model\nรุ่น\n型号", k: "model", w: 22 },
      { h: "Category\nประเภท\n类别", k: "category", w: 12 },
      { h: "Found In\nพบในชีต\n来源表", k: "found_in", w: 15 },
      { h: "User\nผู้รับ/ผู้คืน\n使用人", k: "user_name", w: 26 },
      { h: "Dept\nแผนก\n部门", k: "dept", w: 9 },
      { h: "Condition\nสภาพ\n状况", k: "condition", w: 13 },
      { h: "Form Ref.\nเลขใบรับ-คืน\n交接单号", k: "form_ref", w: 14 },
      { h: "Remark\nหมายเหตุ\n备注", k: "remark", w: 30 },
    ],
  },
  {
    name: "Doc_List", table: "documents", order: "doc_no",
    title: "Document List – ทะเบียนเอกสาร IT · IT文件清单",
    note: "ทุกครั้งที่แก้ไขเอกสาร ให้เพิ่ม Rev. และเปลี่ยนสถานะฉบับเก่าเป็น Obsolete",
    cols: [
      { h: "Doc No.\nเลขที่เอกสาร\n文件编号", k: "doc_no", w: 15 },
      { h: "Title (EN)\nชื่อเอกสาร (EN)\n文件名称(英)", k: "title_en", w: 30 },
      { h: "Title (TH)\nชื่อเอกสาร (TH)\n文件名称(泰)", k: "title_th", w: 30 },
      { h: "Title (CN)\nชื่อเอกสาร (CN)\n文件名称(中)", k: "title_cn", w: 20 },
      { h: "Rev.\nแก้ไขครั้งที่\n版本", k: "rev", w: 7 },
      { h: "Effective Date\nวันที่มีผล\n生效日期", k: "effective", w: 12, t: "date" },
      { h: "Prepared By\nผู้จัดทำ\n编制人", k: "prepared_by", w: 16 },
      { h: "Approved By\nผู้อนุมัติ\n批准人", k: "approved_by", w: 16 },
      { h: "Status\nสถานะ\n状态", k: "status", w: 13 },
      { h: "Remark\nหมายเหตุ\n备注", k: "remark", w: 32 },
    ],
  },
  {
    name: "Assets", table: "assets", order: "id",
    title: "IT Assets – ทะเบียนทรัพย์สิน (นำเข้าจากชีตเดิม อ่านอย่างเดียว)",
    note: "Source = ชีตต้นทางในไฟล์ IT Asset & Records เดิม",
    cols: [
      { h: "Source\nชีตต้นทาง", k: "source_sheet", w: 15 },
      { h: "Asset Tag\nรหัสทรัพย์สิน", k: "asset_tag", w: 14 },
      { h: "Serial\nS/N", k: "serial", w: 22 },
      { h: "Name\nชื่อ", k: "name", w: 24 },
      { h: "Model\nรุ่น", k: "model", w: 22 },
      { h: "Category\nประเภท", k: "category", w: 24 },
      { h: "Manufacturer\nยี่ห้อ", k: "manufacturer", w: 13 },
      { h: "User\nผู้ใช้", k: "user_name", w: 26 },
      { h: "Department\nแผนก", k: "department", w: 11 },
      { h: "Location\nที่ตั้ง", k: "location", w: 16 },
    ],
  },
  {
    name: "Audit_Log", table: "audit_log", order: "id",
    title: "Audit Log – ประวัติการเพิ่ม/แก้ไขข้อมูลทั้งหมด (ลบไม่ได้)",
    note: "Changes = ฟิลด์ที่เปลี่ยน [ค่าเดิม → ค่าใหม่]",
    cols: [
      { h: "When\nเวลา", k: "at", w: 20 },
      { h: "By\nผู้แก้ไข", k: "actor", w: 26 },
      { h: "Table\nตาราง", k: "table_name", w: 14 },
      { h: "Row ID", k: "row_id", w: 8, t: "num" },
      { h: "Action\nการกระทำ", k: "op", w: 9 },
      { h: "Changes\nสิ่งที่เปลี่ยน", k: "changed", w: 80 },
    ],
  },
];

// PostgREST caps responses (1000 rows) – page through everything.
async function fetchAll(supabase: Supabase, table: string, order: string): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select("*").order(order).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data as Row[]));
    if (!data || data.length < 1000) return out;
  }
}

function cellValue(col: Col, v: unknown): ExcelJS.CellValue {
  if (v === null || v === undefined || v === "") return null;
  switch (col.t) {
    case "date": return new Date(`${v}T00:00:00Z`);
    case "time": return String(v).slice(0, 5);
    case "pct": return Number(v) / 100;
    case "num": return Number(v);
  }
  if (col.k === "at") return new Date(String(v)).toLocaleString("en-GB", { timeZone: "Asia/Bangkok" });
  if (col.k === "changed") {
    return Object.entries(v as Record<string, [unknown, unknown]>)
      .map(([f, [a, b]]) => `${f}: ${a ?? "∅"} → ${b ?? "∅"}`).join("; ");
  }
  return typeof v === "object" ? JSON.stringify(v) : (v as string | number);
}

function addSheet(wb: ExcelJS.Workbook, def: SheetDef, rows: Row[]) {
  const ws = wb.addWorksheet(def.name, { views: [{ state: "frozen", ySplit: 3 }] });
  ws.columns = def.cols.map((c) => ({ width: c.w }));
  ws.getCell("A1").value = def.title;
  ws.getCell("A1").font = { bold: true, size: 14, color: { argb: NAVY } };
  ws.getCell("A2").value = def.note;
  ws.getCell("A2").font = { italic: true, size: 9, color: { argb: "FF595959" } };

  const header = ws.getRow(3);
  def.cols.forEach((c, i) => {
    const cell = header.getCell(i + 1);
    cell.value = c.h;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.alignment = { wrapText: true, vertical: "middle", horizontal: "center" };
  });
  header.height = 48;

  rows.forEach((r, ri) => {
    const row = ws.getRow(4 + ri);
    def.cols.forEach((c, ci) => {
      const cell = row.getCell(ci + 1);
      cell.value = cellValue(c, r[c.k]);
      if (c.t === "date") cell.numFmt = "dd/mm/yyyy";
      if (c.t === "pct") cell.numFmt = "0%";
      cell.alignment = { vertical: "top", wrapText: c.w >= 30 };
    });
  });
  ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3 + rows.length, column: def.cols.length } };
}

function addSummary(wb: ExcelJS.Workbook, asOf: string, dash: Record<string, any>) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const ws = wb.addWorksheet("Summary");
  ws.columns = [{ width: 46 }, { width: 16 }, { width: 16 }, { width: 14 }];
  const s = dash.service, bl = dash.backlog, ck = dash.checks;
  const lines: (string | number | null)[][] = [
    ["WDI IT Records – สรุปงาน IT (Weekly / Monthly Summary)"],
    [`ข้อมูล ณ ${asOf.split("-").reverse().join("/")} · สัปดาห์ ${dash.period.week_start} – ${dash.period.week_end}`],
    [],
    ["1. Service Requests & Incidents", "สัปดาห์นี้", "เดือนนี้"],
    ["คำขอที่รับ / Requests received", s.week.received, s.month.received],
    ["  Incident", s.week.incidents, s.month.incidents],
    ["  ความสำคัญ P1", s.week.p1, s.month.p1],
    ["ปิดงาน / Closed", s.week.closed, s.month.closed],
    ["ส่งต่อ HQ/Vendor / Escalated", s.week.escalated, s.month.escalated],
    ["เวลาแก้ไขเฉลี่ย (ชม.) / Avg resolution", s.week.avg_hours ?? "-", s.month.avg_hours ?? "-"],
    [],
    ["2. Open Backlog", "ค้าง", "ค้างนานสุด (วัน)"],
    ...bl.by_priority.map((p: any) => [p.priority, p.open, p.oldest_days ?? "-"]), // eslint-disable-line @typescript-eslint/no-explicit-any
    ["รวมค้าง / Total open", bl.total, bl.oldest_days ?? "-"],
    ["รอ HQ หรือ Vendor", bl.waiting],
    [],
    ["3. Daily & Weekly Checks", "ค่า"],
    ["วันทำงานถึงวันนี้ (เดือนนี้)", ck.working_days],
    ["วันที่เช็คครบ", ck.days_complete],
    ["% Daily Check ครบ", ck.working_days ? Math.min(1, ck.days_complete / ck.working_days) : "-"],
    ["NG สัปดาห์นี้ / เดือนนี้", ck.ng_week, ck.ng_month],
    ["Weekly check สัปดาห์นี้", ck.weekly_done ? "Yes" : "No"],
    ["Backup ล่าสุด", ck.latest_backup ?? "-"],
    ["ดิสก์ว่างต่ำสุด (สัปดาห์ล่าสุด) %", ck.lowest_disk ?? "-"],
    [],
    ["4. Maintenance Status", "ผ่านล่าสุด", "ครบกำหนด", "สถานะ"],
    ...dash.maintenance.types.map((m: any) => [m.type, m.last_pass ?? "-", m.next_due ?? "-", m.status]), // eslint-disable-line @typescript-eslint/no-explicit-any
    ["รอเซ็นรับรองรายไตรมาส", dash.maintenance.pending_signoff],
    ["ทดสอบไม่ผ่านเดือนนี้", dash.maintenance.failed_month],
  ];
  lines.forEach((l) => ws.addRow(l));
  ws.getCell("A1").font = { bold: true, size: 14, color: { argb: NAVY } };
  ws.eachRow((row) => {
    const a = String(row.getCell(1).value ?? "");
    if (/^\d\. /.test(a)) row.eachCell((c) => {
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    });
  });
  const pctRow = ws.getColumn(1).values.findIndex((v) => v === "% Daily Check ครบ");
  if (pctRow > 0) ws.getCell(`B${pctRow}`).numFmt = "0%";
}

// Builds the full export workbook as of `asOf` (yyyy-mm-dd, Thai date) and returns the .xlsx bytes.
export async function buildWorkbook(supabase: Supabase, asOf: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "WDI IT Records";
  wb.created = new Date();

  const { data: dash, error } = await supabase.rpc("dashboard", { report_date: asOf });
  if (error) throw new Error(`dashboard: ${error.message}`);
  addSummary(wb, asOf, dash);

  for (const def of SHEETS) addSheet(wb, def, await fetchAll(supabase, def.table, def.order));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export function exportPaths(asOf: string) {
  const [y, m] = asOf.split("-");
  return {
    daily: `${y}/${m}/daily/IT-Records_${asOf}.xlsx`,
    monthly: `${y}/monthly/IT-Records_${y}-${m}.xlsx`,
  };
}
