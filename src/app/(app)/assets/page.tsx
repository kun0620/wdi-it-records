import Link from "next/link";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import AssetRowLink from "./AssetRowLink";
import ScrollTable from "./ScrollTable";
import AssetIcon from "./AssetIcon";
import { getSession } from "@/lib/supabase/server";
import { todayISO } from "@/lib/dates";
import { ACTIVE, WARRANTY_DAYS } from "@/lib/asset-health";
import { ASSET_STATUSES, PREFIXES, shortCategory, statusOf, type AssetRow } from "./shared";

const ctl = "field text-sm";

// Table columns; key = ?sort= value, col = DB column it orders by.
const COLS = [
  { key: "tag", label: "แท็ก", col: "asset_tag" },
  { key: "status", label: "สถานะ", col: "status" },
  { key: "category", label: "ประเภท", col: "category" },
  { key: "model", label: "ยี่ห้อ / รุ่น", col: "model" },
  { key: "user", label: "ผู้ใช้", col: "user_name" },
  { key: "position", label: "ตำแหน่ง", col: "position" },
  { key: "dept", label: "แผนก", col: "department" },
  { key: "location", label: "ที่ตั้ง", col: "location" },
  { key: "ip", label: "IP", col: "ip_address" },
  { key: "serial", label: "S/N", col: "serial" },
] as const;

export default async function AssetListPage(props: PageProps<"/assets">) {
  const sp = await props.searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const status = str("status");
  const type = str("type");
  const q = str("q");
  // dashboard shortcuts: ?missing=serial, ?warranty=soon (both limited to machines we actually have)
  const missing = str("missing") === "serial";
  const warranty = str("warranty") === "soon";
  const sort = COLS.some((c) => c.key === str("sort")) ? str("sort") : "tag";
  const dir = str("dir") === "desc" ? "desc" : "asc";
  // header link: same filters, this column; clicking the active column flips the direction
  const sortHref = (key: string) => {
    const p = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][]);
    p.set("sort", key);
    p.set("dir", sort === key && dir === "asc" ? "desc" : "asc");
    return `/assets?${p}`;
  };

  const { supabase, role } = await getSession();
  const sortCol = COLS.find((c) => c.key === sort)!.col;
  let query = supabase.from("assets").select("*").order(sortCol, { ascending: dir === "asc", nullsFirst: false });
  if (sortCol !== "asset_tag") query = query.order("asset_tag");
  query = query.limit(1000);
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
    <main className="mx-auto w-full max-w-7xl space-y-4 px-3 py-4 sm:px-6 sm:py-6">
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

      <div className="card overflow-hidden">
        <ScrollTable label={`${rows.length} รายการ · ปัด/ลากตาราง หรือกด ◀ ▶ เพื่อดูคอลัมน์อื่น`}>
          <table className="w-full min-w-[920px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                {COLS.map((c, i) => (
                  <th key={c.key} scope="col"
                    className={`sticky top-0 whitespace-nowrap border-b border-[var(--line)] bg-surface-2 px-3 py-2.5 font-medium ${i === 0 ? "left-0 z-30 shadow-[1px_0_0_var(--line)]" : "z-20"}`}>
                    <Link href={sortHref(c.key)} className="inline-flex items-center gap-1 hover:text-foreground">
                      {c.label}
                      {sort === c.key && (dir === "asc" ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />)}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={COLS.length} className="px-4 py-8 text-center text-muted">ไม่พบรายการ</td></tr>
              )}
              {rows.map((r) => {
                const st = statusOf(r.status);
                const td = "whitespace-nowrap border-b border-[var(--line)] bg-surface px-3 py-2.5 group-even:bg-surface-2 group-hover:bg-[color-mix(in_srgb,var(--brand)_9%,var(--surface))]";
                const dash = <span className="text-muted">–</span>;
                return (
                  <AssetRowLink key={r.id} href={`/assets/${r.id}`}>
                    <td className={`${td} sticky left-0 z-10 shadow-[1px_0_0_var(--line)]`}>
                      <Link href={`/assets/${r.id}`} className="flex items-center gap-2">
                        <span className="hidden sm:contents"><AssetIcon tag={r.asset_tag} category={r.category} size="sm" /></span>
                        <span className="font-mono text-xs font-semibold text-brand sm:text-[13px]">{r.asset_tag ?? "—"}</span>
                      </Link>
                    </td>
                    <td className={td}><span className={`rounded-full px-2 py-0.5 text-xs ${st?.tone ?? ""}`}>{st?.th ?? r.status}</span></td>
                    <td className={`${td} max-w-36 truncate`} title={r.category ?? ""}>{shortCategory(r.category) ?? dash}</td>
                    <td className={`${td} max-w-60 truncate`} title={[r.manufacturer, r.model, r.name].filter(Boolean).join(" ")}>
                      {[r.manufacturer, r.model].filter(Boolean).join(" ") || r.name || dash}
                    </td>
                    <td className={`${td} max-w-56 truncate`} title={r.user_name ?? ""}>{r.user_name ?? dash}</td>
                    <td className={`${td} max-w-52 truncate`} title={r.position ?? ""}>{r.position ?? dash}</td>
                    <td className={td}>{r.department ?? dash}</td>
                    <td className={`${td} max-w-40 truncate`}>{r.location ?? dash}</td>
                    <td className={`${td} font-mono text-xs`}>{r.ip_address ?? dash}</td>
                    <td className={`${td} font-mono text-xs`}>{r.serial ?? dash}</td>
                  </AssetRowLink>
                );
              })}
            </tbody>
          </table>
        </ScrollTable>
      </div>
    </main>
  );
}
