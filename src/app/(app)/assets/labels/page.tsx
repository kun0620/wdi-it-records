import QRCode from "qrcode";
import { getSession } from "@/lib/supabase/server";
import { appBaseUrl, isLocalUrl } from "@/lib/app-url";
import { ASSET_STATUSES, PREFIXES, type AssetRow } from "../shared";
import PrintButton from "./PrintButton";

// A4 sticker sheet: 3 x 8 labels of 70 x 37 mm (common "24 per sheet" stock, no page margin).
const ctl = "input w-auto text-sm";

export default async function LabelsPage(props: PageProps<"/assets/labels">) {
  const sp = await props.searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const ids = str("ids").split(",").map(Number).filter(Boolean);
  const type = str("type");
  const status = str("status");
  const skip = Math.min(23, Math.max(0, Number(str("skip")) || 0));   // labels already used on a partly-used sheet

  const { supabase } = await getSession();
  let query = supabase.from("assets").select("*").not("asset_tag", "is", null).order("asset_tag");
  if (ids.length) query = query.in("id", ids);
  else {
    if (type) query = query.like("asset_tag", `WDI-${type}-%`);
    if (status) query = query.eq("status", status);
    else query = query.not("status", "in", "(Retired,Lost,Planned,Waiting)");
  }
  const { data } = await query;
  const rows = (data ?? []) as Pick<AssetRow, "id" | "asset_tag" | "model" | "manufacturer" | "name" | "category" | "serial">[];

  const base = await appBaseUrl();
  const labels = await Promise.all(rows.map(async (r) => ({
    ...r,
    svg: await QRCode.toString(`${base}/a/${r.asset_tag}`, { type: "svg", margin: 0, errorCorrectionLevel: "M" }),
  })));

  return (
    <main className="mx-auto w-full max-w-4xl space-y-4 px-4 py-6 print:m-0 print:max-w-none print:p-0">
      <style>{`
        @page { size: A4; margin: 0; }
        .sheet { display: grid; grid-template-columns: repeat(3, 70mm); grid-auto-rows: 37mm; width: 210mm; margin-inline: auto; }
        .label { box-sizing: border-box; padding: 3mm; display: flex; gap: 2.5mm; align-items: center; overflow: hidden; break-inside: avoid; background: #fff; color: #000; }
        .label svg { width: 27mm; height: 27mm; flex-shrink: 0; }
        @media screen { .sheet { outline: 1px solid #ccc; } .label { outline: 1px dashed #ccc; } }
        @media print { header, .no-print { display: none !important; } body { background: #fff !important; } }
      `}</style>

      <div className="no-print space-y-3">
        <h1 className="text-lg font-semibold">พิมพ์ป้าย QR <span className="text-sm font-normal opacity-60">{labels.length} ป้าย</span></h1>
        {isLocalUrl(base) && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            QR ตอนนี้ชี้ไปที่ <b>{base}</b> ซึ่งมือถือนอกเครื่องนี้เปิดไม่ได้ — พิมพ์จริงหลัง deploy ขึ้น Vercel (หรือตั้งค่า NEXT_PUBLIC_APP_URL)
          </p>
        )}
        {ids.length ? (
          <p className="text-sm opacity-70">พิมพ์เฉพาะที่เลือก {ids.length} ชิ้น</p>
        ) : (
          <form className="flex flex-wrap gap-2">
            <select name="type" defaultValue={type} className={ctl}>
              <option value="">ทุกประเภท</option>
              {PREFIXES.map((p) => <option key={p.p} value={p.p}>{p.p} · {p.th}</option>)}
            </select>
            <select name="status" defaultValue={status} className={ctl}>
              <option value="">ที่มีอยู่ (ไม่รวมเลิกใช้/หาย/รอของ)</option>
              {ASSET_STATUSES.filter((s) => s.v !== "Planned" && s.v !== "Waiting").map((s) => <option key={s.v} value={s.v}>{s.th}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm">ข้ามช่องที่ใช้ไปแล้ว
              <input name="skip" type="number" min={0} max={23} defaultValue={skip || ""} className={`${ctl} w-20`} />
            </label>
            <button className={ctl}>แสดง</button>
          </form>
        )}
        <p className="text-xs opacity-60">กระดาษสติกเกอร์ A4 แบบ 24 ดวง (3 × 8, ดวงละ 70 × 37 มม.) · ตอนพิมพ์ตั้ง Margins = None และ Scale = 100%</p>
        <PrintButton />
      </div>

      <div className="sheet">
        {Array.from({ length: skip }, (_, i) => <div key={`s${i}`} />)}
        {labels.map((l) => (
          <div key={l.id} className="label">
            <span dangerouslySetInnerHTML={{ __html: l.svg }} />
            <div className="min-w-0 leading-tight">
              <div className="font-mono text-[11pt] font-bold">{l.asset_tag}</div>
              <div className="truncate text-[7.5pt]">{[l.manufacturer, l.model].filter(Boolean).join(" ") || l.name || l.category}</div>
              {l.serial && <div className="truncate text-[7pt]">S/N {l.serial}</div>}
              <div className="mt-1 text-[6.5pt] opacity-70">WDI IT · ห้ามแกะ</div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
