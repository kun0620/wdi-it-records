import Link from "next/link";
import {
  ChevronDown, ChevronUp, Columns3, LayoutGrid, MapPin, Plus, QrCode, Rows3, Search,
} from "lucide-react";
import { getSession } from "@/lib/supabase/server";
import { todayISO } from "@/lib/dates";
import { ACTIVE, WARRANTY_DAYS } from "@/lib/asset-health";
import AssetIcon, { KIND_ICON } from "./AssetIcon";
import AssetRowLink from "./AssetRowLink";
import ScrollTable from "./ScrollTable";
import ExportDialog from "./ExportDialog";
import { ASSET_STATUSES, PREFIXES, STATUS_TONE, shortCategory, statusOf, type AssetRow } from "./shared";

const TYPE_EN: Record<string, string> = { PC: "Desktop", NB: "Laptop", NW: "Network", CA: "Camera/NVR", PR: "Printer", AC: "Face scan", OT: "Other" };

// Table columns; key = ?sort= / ?cols= value, col = DB column it orders by, w = min width.
const COLS = [
  { key: "tag", label: "แท็ก", col: "asset_tag", w: 150 },
  { key: "status", label: "สถานะ", col: "status", w: 110 },
  { key: "category", label: "ประเภท", col: "category", w: 130 },
  { key: "model", label: "ยี่ห้อ/รุ่น", col: "model", w: 200 },
  { key: "user", label: "ผู้ใช้", col: "user_name", w: 150 },
  { key: "position", label: "ตำแหน่ง", col: "position", w: 170 },
  { key: "dept", label: "แผนก", col: "department", w: 100 },
  { key: "location", label: "ที่ตั้ง", col: "location", w: 140 },
  { key: "ip", label: "IP", col: "ip_address", w: 130 },
  { key: "serial", label: "S/N", col: "serial", w: 150 },
] as const;
type ColKey = (typeof COLS)[number]["key"];
const COVER_DEFAULT: ColKey[] = ["status", "user", "ip"];   // cover screen: at most 3 besides the tag

export default async function AssetListPage(props: PageProps<"/assets">) {
  const sp = await props.searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const status = str("status");
  const type = str("type");
  const q = str("q");
  const view = str("view") === "table" ? "table" : "cards";
  const missing = str("missing") === "serial";          // dashboard shortcuts
  const warranty = str("warranty") === "soon";
  const sort = COLS.some((c) => c.key === str("sort")) ? str("sort") : "tag";
  const dir = str("dir") === "desc" ? "desc" : "asc";
  const coverCols = (str("cols") ? str("cols").split(",") : COVER_DEFAULT)
    .filter((c): c is ColKey => c !== "tag" && COLS.some((x) => x.key === c)).slice(0, 3);

  // link that keeps the current filters and changes some of them
  const href = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][]);
    for (const [k, v] of Object.entries(patch)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const s = p.toString();
    return s ? `/assets?${s}` : "/assets";
  };
  const sortHref = (key: string) => href({ sort: key, dir: sort === key && dir === "asc" ? "desc" : "asc" });
  const toggleCol = (key: ColKey) => {
    const next = coverCols.includes(key) ? coverCols.filter((c) => c !== key) : [...coverCols, key].slice(-3);
    return href({ cols: next.join(",") || "status", view: "table" });
  };

  const { supabase, role } = await getSession();
  const sortCol = COLS.find((c) => c.key === sort)!.col;
  let query = supabase.from("assets").select("*").order(sortCol, { ascending: dir === "asc", nullsFirst: false });
  if (sortCol !== "asset_tag") query = query.order("asset_tag");
  query = query.limit(1000);
  if (status) query = query.eq("status", status);
  else if (missing || warranty) query = query.in("status", ACTIVE);
  if (missing) query = query.or("serial.is.null,serial.eq.");
  if (warranty) query = query.lte("warranty_end", new Date(Date.parse(todayISO()) + WARRANTY_DAYS * 864e5).toISOString().slice(0, 10));
  if (type) query = query.like("asset_tag", `WDI-${type}-%`);
  if (q) {
    const like = `%${q.replace(/[%_,()]/g, " ")}%`;
    query = query.or(["asset_tag", "serial", "name", "model", "user_name", "position", "department", "location", "ip_address", "mac"]
      .map((c) => `${c}.ilike.${like}`).join(","));
  }
  const [{ data, error }, { data: all }] = await Promise.all([query, supabase.from("assets").select("asset_tag, status")]);
  const rows = (data ?? []) as AssetRow[];
  const typeCount = (p: string) => (all ?? []).filter((a) => a.asset_tag?.startsWith(`WDI-${p}-`)).length;
  const statusCount = (s: string) => (all ?? []).filter((a) => a.status === s && (!type || a.asset_tag?.startsWith(`WDI-${type}-`))).length;
  const dash = <span className="muted">—</span>;

  const cell = (r: AssetRow, key: ColKey) => {
    switch (key) {
      case "status": return <span className={`pill ${STATUS_TONE[r.status] ?? "t-grey"}`}>{statusOf(r.status)?.th ?? r.status}</span>;
      case "category": return <span title={r.category ?? ""}>{shortCategory(r.category) ?? dash}</span>;
      case "model": return [r.manufacturer, r.model].filter(Boolean).join(" ") || r.name || dash;
      case "user": return r.user_name ?? dash;
      case "position": return r.position ?? dash;
      case "dept": return r.department ?? dash;
      case "location": return r.location ?? dash;
      case "ip": return r.ip_address ? <span className="mono" style={{ fontSize: 12.5 }}>{r.ip_address}</span> : dash;
      case "serial": return r.serial ? <span className="mono" style={{ fontSize: 12.5 }}>{r.serial}</span> : <span className="miss">ยังไม่มี</span>;
      default: return null;
    }
  };

  const table = (keys: ColKey[], cover: boolean) => (
    <ScrollTable label="ปัด/ลากตาราง หรือกด ◀ ▶ เพื่อดูคอลัมน์อื่น">
      <table className="tbl">
        <thead>
          <tr>
            {(["tag", ...keys] as ColKey[]).map((k) => {
              const c = COLS.find((x) => x.key === k)!;
              return (
                <th key={k} className={`${k === "tag" ? "fz" : ""} ${sort === k ? "sorted" : ""}`} style={{ minWidth: cover ? Math.min(c.w, 120) : c.w }}
                  aria-sort={sort === k ? (dir === "asc" ? "ascending" : "descending") : undefined}>
                  <Link href={sortHref(k)} className="th">
                    {c.label}
                    {sort === k && dir === "desc" ? <ChevronDown className="ic size-3.5" /> : <ChevronUp className="ic size-3.5" />}
                  </Link>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={keys.length + 1} className="muted text-center">ไม่พบรายการ</td></tr>}
          {rows.map((r) => (
            <AssetRowLink key={r.id} href={`/assets/${r.id}`}>
              <td className="fz">
                <Link href={`/assets/${r.id}`} className="tagcell" style={cover ? { fontSize: 11.5, gap: 6 } : undefined}>
                  <AssetIcon tag={r.asset_tag} category={r.category} size="sm" />{r.asset_tag ?? "—"}
                </Link>
              </td>
              {keys.map((k) => <td key={k} className={k === "model" || k === "position" ? "max-w-60 truncate" : ""}>{cell(r, k)}</td>)}
            </AssetRowLink>
          ))}
        </tbody>
      </table>
    </ScrollTable>
  );


  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-3 py-3 sm:gap-4 sm:px-5 sm:py-5 lg:px-7">
      {/* toolbar */}
      <section className="card flex flex-col gap-3 !p-3 sm:!p-4">
        <div className="flex flex-wrap items-center gap-2">
          <form className="iwrap min-w-0 flex-1 sm:max-w-[380px]">
            {type && <input type="hidden" name="type" value={type} />}
            {status && <input type="hidden" name="status" value={status} />}
            {view === "table" && <input type="hidden" name="view" value="table" />}
            <Search className="ic prefix size-4" />
            <input name="q" defaultValue={q} className="input pl search" placeholder="ค้นหาแท็ก, รุ่น, ผู้ใช้, IP, S/N…" aria-label="ค้นหาทรัพย์สิน" />
          </form>
          <div className="seg sm:hidden" role="group" aria-label="มุมมอง">
            <Link href={href({ view: null })} className={view === "cards" ? "on" : ""} aria-label="การ์ด" aria-pressed={view === "cards"}><LayoutGrid className="size-4" /></Link>
            <Link href={href({ view: "table" })} className={view === "table" ? "on" : ""} aria-label="ตาราง" aria-pressed={view === "table"}><Rows3 className="size-4" /></Link>
          </div>
          <span className="hidden flex-1 sm:block" />
          {/* cover: own row under the search, so the search box keeps its width */}
          <div className="flex gap-2 max-sm:order-last max-sm:w-full max-sm:[&>*]:flex-1">
            <Link href={`/assets/labels?${new URLSearchParams({ type, status })}`} className="btn btn-secondary max-sm:!h-9 max-sm:!px-3 max-sm:!text-[13px]">
              <QrCode className="size-4" />พิมพ์ป้าย QR
            </Link>
            <ExportDialog assets={all ?? []} today={todayISO()} q={q} initialType={type} initialStatus={status} />
          </div>
          {role === "editor" && <Link href="/assets/new" className="btn btn-primary hidden sm:inline-flex"><Plus className="size-4" />เพิ่ม</Link>}
        </div>

        <div className="hscroll sm:flex-wrap">
          <span className="micro hidden w-14 shrink-0 self-center sm:block">ประเภท</span>
          <Link href={href({ type: null })} className={`chip ${!type ? "on" : ""}`}>ทั้งหมด <span className="n">{(all ?? []).length}</span></Link>
          {PREFIXES.map((p) => {
            const Icon = KIND_ICON[p.p];
            return (
              <Link key={p.p} href={href({ type: type === p.p ? null : p.p })} className={`chip ${type === p.p ? "on" : ""}`}>
                <Icon className="size-4" />{p.p}<span className="hidden lg:inline">{TYPE_EN[p.p]}</span><span className="n">{typeCount(p.p)}</span>
              </Link>
            );
          })}
        </div>
        <div className="hscroll sm:flex-wrap">
          <span className="micro hidden w-14 shrink-0 self-center sm:block">สถานะ</span>
          <Link href={href({ status: null })} className={`chip ${!status ? "on" : ""}`}>ทุกสถานะ</Link>
          {ASSET_STATUSES.map((s) => (
            <Link key={s.v} href={href({ status: status === s.v ? null : s.v })} className={`chip ${status === s.v ? "sel" : ""}`} style={{ paddingLeft: 5 }}>
              <span className={`pill sm ${STATUS_TONE[s.v]}`}>{s.th}</span><span className="n">{statusCount(s.v)}</span>
            </Link>
          ))}
        </div>

        {view === "table" && (
          <div className="sm:hidden">
            <div className="mb-2 flex items-center gap-1.5">
              <Columns3 className="size-4 text-[var(--accentInk)]" /><span className="small font-semibold">คอลัมน์ที่แสดง</span><span className="small muted">· สูงสุด 3 บนจอพับ</span>
            </div>
            <div className="hscroll">
              {COLS.filter((c) => c.key !== "tag").map((c) => (
                <Link key={c.key} href={toggleCol(c.key)} className={`chip ${coverCols.includes(c.key) ? "sel" : ""}`} style={{ height: 30, fontSize: 12.5 }}>{c.label}</Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {error && <p className="ierr">{error.message}</p>}
      {(missing || warranty) && (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="pill t-warn">{missing ? "เฉพาะที่ยังไม่มี Serial No." : `ประกันหมด / ใกล้หมด (≤ ${WARRANTY_DAYS} วัน)`}</span>
          <Link href="/assets" className="link">ล้างตัวกรอง ✕</Link>
        </p>
      )}
      <p className="small muted px-1">{rows.length} รายการ · เรียงตาม{COLS.find((c) => c.key === sort)!.label} {dir === "asc" ? "↑" : "↓"}</p>

      {/* cover: cards (default) or a table with the picked columns */}
      <div className="sm:hidden">
        {view === "cards" ? (
          <div className="flex flex-col gap-2 pb-20">
            {rows.length === 0 && <p className="muted py-6 text-center">ไม่พบรายการ</p>}
            {rows.map((r) => (
              <Link key={r.id} href={`/assets/${r.id}`} className="acard">
                <AssetIcon tag={r.asset_tag} category={r.category} />
                <div className="min-w-0 flex-1">
                  <div className="row" style={{ gap: 6 }}>
                    <span className="mono" style={{ fontWeight: 700, fontSize: 13.5, color: "var(--accentInk)" }}>{r.asset_tag ?? "ยังไม่มีแท็ก"}</span>
                    <span className="flex-1" />
                    <span className={`pill sm ${STATUS_TONE[r.status] ?? "t-grey"}`}>{statusOf(r.status)?.th ?? r.status}</span>
                  </div>
                  <div className="ellip" style={{ fontWeight: 600, fontSize: 14, marginTop: 2 }}>
                    {[r.manufacturer, r.model].filter(Boolean).join(" ") || r.name || `${shortCategory(r.category) ?? ""} (ไม่ระบุรุ่น)`}
                  </div>
                  <div className="small muted ellip">{[r.user_name ?? "ไม่มีผู้ใช้", r.position, r.department].filter(Boolean).join(" · ")}</div>
                  {(r.location || r.ip_address) && (
                    <div className="small muted row" style={{ gap: 6, marginTop: 2 }}>
                      <MapPin className="size-3.5 shrink-0" />
                      <span className="ellip">{r.location ?? "ยังไม่ระบุที่ตั้ง"}</span>
                      {r.ip_address && <><span className="dot-sep" /><span className="mono">{r.ip_address}</span></>}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="tbox">{table(coverCols, true)}</div>
        )}
      </div>

      {/* unfolded / desktop: the full table */}
      <div className="tbox hidden sm:block">{table(COLS.filter((c) => c.key !== "tag").map((c) => c.key), false)}</div>

      {role === "editor" && (
        <Link href="/assets/new" className="fab !fixed sm:!hidden" aria-label="เพิ่มทรัพย์สิน"><Plus className="size-6" /></Link>
      )}
    </main>
  );
}
