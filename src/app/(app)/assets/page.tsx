import Link from "next/link";
import { getSession } from "@/lib/supabase/server";
import { ASSET_STATUSES, PREFIXES, statusOf, type AssetRow } from "./shared";

const ctl = "rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20";

export default async function AssetListPage(props: PageProps<"/assets">) {
  const sp = await props.searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const status = str("status");
  const type = str("type");
  const q = str("q");

  const { supabase, role } = await getSession();
  let query = supabase.from("assets").select("*").order("asset_tag", { nullsFirst: false }).limit(1000);
  if (status) query = query.eq("status", status);
  else query = query.not("status", "in", "(Retired,Planned)");      // default: things we actually have
  if (type) query = query.like("asset_tag", `WDI-${type}-%`);
  if (q) {
    const like = `%${q.replace(/[%_,()]/g, " ")}%`;
    query = query.or(["asset_tag", "serial", "name", "model", "user_name", "department", "location", "ip_address", "mac"]
      .map((c) => `${c}.ilike.${like}`).join(","));
  }
  const { data, error } = await query;
  const rows = (data ?? []) as AssetRow[];

  return (
    <main className="mx-auto w-full max-w-4xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">ทรัพย์สิน IT <span className="text-sm font-normal opacity-60">Assets</span></h1>
        <div className="flex gap-2">
          <Link href={`/assets/labels?${new URLSearchParams({ type, status })}`}
            className="rounded-md border border-black/15 px-4 py-2 text-sm dark:border-white/20">พิมพ์ป้าย QR</Link>
          {role === "editor" && <Link href="/assets/new" className="rounded-md bg-foreground px-4 py-2 text-sm text-background">+ เพิ่ม</Link>}
        </div>
      </div>

      <form className="flex flex-wrap gap-2">
        <select name="status" defaultValue={status} className={ctl}>
          <option value="">ที่มีอยู่ (ไม่รวมเลิกใช้/แผน)</option>
          {ASSET_STATUSES.map((s) => <option key={s.v} value={s.v}>{s.th}</option>)}
        </select>
        <select name="type" defaultValue={type} className={ctl}>
          <option value="">ทุกประเภท</option>
          {PREFIXES.map((p) => <option key={p.p} value={p.p}>{p.p} · {p.th}</option>)}
        </select>
        <input name="q" defaultValue={q} placeholder="ค้นหา แท็ก / S/N / รุ่น / ผู้ใช้ / IP" className={`${ctl} min-w-48 flex-1`} />
        <button className={ctl}>ค้นหา</button>
      </form>

      {error && <p className="text-sm text-red-600">{error.message}</p>}
      <p className="text-xs opacity-60">{rows.length} รายการ</p>

      <ul className="divide-y divide-black/5 rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/15">
        {rows.length === 0 && <li className="px-4 py-6 text-center text-sm opacity-60">ไม่พบรายการ</li>}
        {rows.map((r) => {
          const st = statusOf(r.status);
          return (
            <li key={r.id}>
              <Link href={`/assets/${r.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-black/[.03] dark:hover:bg-white/[.04]">
                <span className="w-28 shrink-0 font-mono text-sm">{r.asset_tag ?? "—"}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">
                    {[r.manufacturer, r.model].filter(Boolean).join(" ") || r.name || <span className="opacity-60">{r.category} (ไม่ระบุรุ่น)</span>}
                    {r.name && r.model && <span className="font-normal opacity-60"> · {r.name}</span>}
                  </div>
                  <p className="truncate text-xs opacity-60">
                    {[r.category, r.user_name, r.department, r.location, r.ip_address, r.serial && `S/N ${r.serial}`].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${st?.tone ?? ""}`}>{st?.th ?? r.status}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
