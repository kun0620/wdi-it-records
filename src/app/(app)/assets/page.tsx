import Link from "next/link";
import { Search } from "lucide-react";
import AssetIcon from "./AssetIcon";
import { getSession } from "@/lib/supabase/server";
import { todayISO } from "@/lib/dates";
import { ACTIVE, WARRANTY_DAYS } from "@/lib/asset-health";
import { ASSET_STATUSES, PREFIXES, statusOf, type AssetRow } from "./shared";

const ctl = "field text-sm";

export default async function AssetListPage(props: PageProps<"/assets">) {
  const sp = await props.searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const status = str("status");
  const type = str("type");
  const q = str("q");
  // dashboard shortcuts: ?missing=serial, ?warranty=soon (both limited to machines we actually have)
  const missing = str("missing") === "serial";
  const warranty = str("warranty") === "soon";

  const { supabase, role } = await getSession();
  let query = supabase.from("assets").select("*").order("asset_tag", { nullsFirst: false }).limit(1000);
  if (status) query = query.eq("status", status);
  else if (missing || warranty) query = query.in("status", ACTIVE);
  else query = query.not("status", "in", "(Retired,Planned)");      // default: things we actually have
  if (missing) query = query.or("serial.is.null,serial.eq.");
  if (warranty) query = query.lte("warranty_end", new Date(Date.parse(todayISO()) + WARRANTY_DAYS * 864e5).toISOString().slice(0, 10))
    .order("warranty_end");
  if (type) query = query.like("asset_tag", `WDI-${type}-%`);
  if (q) {
    const like = `%${q.replace(/[%_,()]/g, " ")}%`;
    query = query.or(["asset_tag", "serial", "name", "model", "user_name", "position", "department", "location", "ip_address", "mac"]
      .map((c) => `${c}.ilike.${like}`).join(","));
  }
  const { data, error } = await query;
  const rows = (data ?? []) as AssetRow[];

  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 px-3 py-4 sm:px-6 sm:py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">ทรัพย์สิน IT</h1>
          <p className="text-sm text-muted">Asset register · {rows.length} รายการ</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/assets/labels?${new URLSearchParams({ type, status })}`}
            className="btn">พิมพ์ป้าย QR</Link>
          {role === "editor" && <Link href="/assets/new" className="btn btn-primary">+ เพิ่ม</Link>}
        </div>
      </div>

      <form className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <select name="status" defaultValue={status} className={`${ctl} sm:w-auto`}>
          <option value="">ที่มีอยู่ (ไม่รวมเลิกใช้/แผน)</option>
          {ASSET_STATUSES.map((s) => <option key={s.v} value={s.v}>{s.th}</option>)}
        </select>
        <select name="type" defaultValue={type} className={`${ctl} sm:w-auto`}>
          <option value="">ทุกประเภท</option>
          {PREFIXES.map((p) => <option key={p.p} value={p.p}>{p.p} · {p.th}</option>)}
        </select>
        <div className="col-span-2 flex gap-2 sm:min-w-56 sm:flex-1">
          <input name="q" defaultValue={q} placeholder="ค้นหา แท็ก / S/N / รุ่น / ผู้ใช้ / IP" className={`${ctl} min-w-0 flex-1`} />
          <button className="btn btn-primary"><Search className="size-4" /><span className="sr-only sm:not-sr-only">ค้นหา</span></button>
        </div>
      </form>

      {/* Export: pick any combination of types/statuses; a plain GET form so the browser downloads the file */}
      <details className="card">
        <summary className="cursor-pointer select-none px-4 py-2.5 text-sm font-medium">Export Excel — เลือกประเภท / สถานะ</summary>
        <form action="/assets/export" method="get" className="space-y-3 border-t border-[var(--line)] px-4 py-3">
          <fieldset>
            <legend className="mb-1.5 text-xs opacity-60">ประเภท (ไม่ติ๊กเลย = ทั้งหมด)</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {PREFIXES.map((p) => (
                <label key={p.p} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" name="type" value={p.p} defaultChecked={type === p.p} className="size-4" />
                  {p.th} <span className="text-xs opacity-50">{p.p}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-1.5 text-xs opacity-60">สถานะ (ไม่ติ๊กเลย = ทั้งหมด รวมเลิกใช้และแผนจัดซื้อ)</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {ASSET_STATUSES.map((s) => (
                <label key={s.v} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" name="status" value={s.v} defaultChecked={status === s.v} className="size-4" />
                  {s.th}
                </label>
              ))}
            </div>
          </fieldset>
          {q && <input type="hidden" name="q" value={q} />}
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn btn-primary">ดาวน์โหลด .xlsx</button>
            {q && <span className="text-xs opacity-60">ใช้คำค้นหา “{q}” ด้วย</span>}
          </div>
        </form>
      </details>

      {error && <p className="text-sm text-red-600">{error.message}</p>}
      {(missing || warranty) && (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            {missing ? "เฉพาะที่ยังไม่มี Serial No." : `ประกันหมด / ใกล้หมด (≤ ${WARRANTY_DAYS} วัน)`}
          </span>
          <Link href="/assets" className="text-xs opacity-70 hover:underline">ล้างตัวกรอง ✕</Link>
        </p>
      )}

      <ul className="card divide-y divide-[var(--line)] overflow-hidden">
        {rows.length === 0 && <li className="px-4 py-6 text-center text-sm opacity-60">ไม่พบรายการ</li>}
        {rows.map((r) => {
          const st = statusOf(r.status);
          return (
            <li key={r.id}>
              <Link href={`/assets/${r.id}`} className="flex items-start gap-3 px-3 py-3 hover:bg-surface-2 sm:px-4">
                <AssetIcon tag={r.asset_tag} category={r.category} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-brand">{r.asset_tag ?? "ยังไม่มีแท็ก"}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${st?.tone ?? ""}`}>{st?.th ?? r.status}</span>
                  </div>
                  <div className="truncate text-[15px] font-medium">
                    {[r.manufacturer, r.model].filter(Boolean).join(" ") || r.name || <span className="opacity-60">{r.category} (ไม่ระบุรุ่น)</span>}
                    {r.name && r.model && <span className="font-normal opacity-60"> · {r.name}</span>}
                  </div>
                  <p className="truncate text-xs text-muted">
                    {[r.user_name, r.position, r.department, r.location, r.ip_address, r.serial && `S/N ${r.serial}`].filter(Boolean).join(" · ") || r.category}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
