import Link from "next/link";
import { Clock3, Plus, Search, Tag, User } from "lucide-react";
import { getSession } from "@/lib/supabase/server";
import { daysBetween, shortThaiDate, todayISO } from "@/lib/dates";
import { OPEN_STATUSES, SERVICE_TONE, type ServiceRow } from "./shared";

export default async function ServiceListPage(props: PageProps<"/service">) {
  const sp = await props.searchParams;
  const view = sp.view === "all" ? "all" : "open";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const saved = typeof sp.saved === "string" ? Number(sp.saved) : null;

  const { supabase, role } = await getSession();
  let query = supabase.from("service_log_v").select("*").order("id", { ascending: false }).limit(500);
  if (view === "open") query = query.in("status", OPEN_STATUSES);
  if (q) {
    const like = `%${q.replace(/[%_,()]/g, " ")}%`;
    query = query.or(["req_no", "requester", "detail", "system", "action", "asset_tag"].map((c) => `${c}.ilike.${like}`).join(","));
  }
  const [{ data, error }, { count: openCount }, { count: allCount }] = await Promise.all([
    query,
    supabase.from("service_log").select("id", { count: "exact", head: true }).in("status", OPEN_STATUSES),
    supabase.from("service_log").select("id", { count: "exact", head: true }),
  ]);
  const rows = (data ?? []) as ServiceRow[];
  const today = todayISO();
  const savedRow = saved ? rows.find((r) => r.id === saved) : null;
  const tab = (v: "open" | "all") => `/service?${new URLSearchParams({ ...(v === "all" ? { view: "all" } : {}), ...(q ? { q } : {}) })}`;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-3 py-3 sm:gap-4 sm:px-5 sm:py-5 lg:px-7">
      <section className="card flex flex-col gap-2.5 !p-3 sm:flex-row sm:items-center sm:!p-4">
        <div className="row" style={{ gap: 8 }}>
          <div className="seg" role="group" aria-label="ตัวกรอง">
            <Link href={tab("open")} className={view === "open" ? "on" : ""} aria-pressed={view === "open"}>เปิดอยู่ <span className="muted">{openCount ?? 0}</span></Link>
            <Link href={tab("all")} className={view === "all" ? "on" : ""} aria-pressed={view === "all"}>ทั้งหมด <span className="muted">{allCount ?? 0}</span></Link>
          </div>
          <span className="flex-1 sm:hidden" />
          {role === "editor" && <Link href="/service/new" className="btn btn-primary sm:hidden"><Plus className="size-4" />เพิ่ม</Link>}
        </div>
        <form className="iwrap flex-1">
          {view === "all" && <input type="hidden" name="view" value="all" />}
          <Search className="ic prefix size-4" />
          <input name="q" defaultValue={q} className="input pl search" placeholder="ค้นหา SR, ผู้แจ้ง, ระบบ, แท็ก…" aria-label="ค้นหางาน" />
        </form>
        {role === "editor" && <Link href="/service/new" className="btn btn-primary hidden sm:inline-flex"><Plus className="size-4" />แจ้งปัญหา</Link>}
      </section>

      {saved && <p className="banner info small">บันทึกแล้ว {savedRow?.req_no ?? ""}</p>}
      {error && <p className="ierr">{error.message}</p>}

      <div className="grid gap-2.5 sm:grid-cols-2">
        {rows.length === 0 && <p className="muted py-6 text-center sm:col-span-2">{view === "open" ? "ไม่มีงานค้าง" : "ยังไม่มีข้อมูล"}</p>}
        {rows.map((r) => {
          const open = OPEN_STATUSES.includes(r.status);
          return (
            <Link key={r.id} href={`/service/${r.id}`} className="scard">
              <div className="row" style={{ gap: 8 }}>
                <span className={`prio ${r.priority.toLowerCase()}`}>{r.priority}</span>
                <span className="mono small" style={{ fontWeight: 600, color: "var(--accentInk)" }}>{r.req_no}</span>
                {r.type === "Incident" && <span className="kind-inc">Incident</span>}
                <span className="flex-1" />
                <span className={`pill sm ${SERVICE_TONE[r.status] ?? "t-grey"}`}>{r.status}</span>
              </div>
              <div className="desc">{r.detail || <span className="muted">{r.type}</span>}</div>
              <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                <span className="small ink2 row" style={{ gap: 4 }}><User className="size-3.5" />{[r.requester, r.dept].filter(Boolean).join(" · ")}</span>
                {r.system && <span className="tagchip" style={{ fontFamily: "inherit" }}>{r.system}</span>}
                {r.asset_tag && <span className="tagchip"><Tag className="size-3" />{r.asset_tag}</span>}
                <span className="flex-1" />
                <span className="days"><Clock3 className="size-3.5" />
                  {open ? `${daysBetween(r.req_date, today)} วัน` : r.hours != null ? `${r.hours} ชม.` : shortThaiDate(r.req_date)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
