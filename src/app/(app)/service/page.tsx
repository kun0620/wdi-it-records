import Link from "next/link";
import { getSession } from "@/lib/supabase/server";
import { daysBetween, thDate, todayISO } from "@/lib/dates";
import { OPEN_STATUSES, PRIORITY_TONE, STATUS_TONE, type ServiceRow } from "./shared";

export default async function ServiceListPage(props: PageProps<"/service">) {
  const sp = await props.searchParams;
  const view = sp.view === "all" ? "all" : "open";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const saved = typeof sp.saved === "string" ? Number(sp.saved) : null;

  const { supabase, role } = await getSession();
  let query = supabase.from("service_log").select("*").order("id", { ascending: false }).limit(500);
  if (view === "open") query = query.in("status", OPEN_STATUSES);
  if (q) {
    const like = `%${q.replace(/[%_,()]/g, " ")}%`;
    query = query.or(["req_no", "requester", "detail", "system", "action"].map((c) => `${c}.ilike.${like}`).join(","));
  }
  const { data, error } = await query;
  const rows = (data ?? []) as ServiceRow[];
  const today = todayISO();
  const savedRow = saved ? rows.find((r) => r.id === saved) : null;

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">คำขอ / ปัญหา <span className="text-sm font-normal opacity-60">Service Log</span></h1>
        {role === "editor" && (
          <Link href="/service/new" className="rounded-md bg-foreground px-4 py-2 text-sm text-background">+ เพิ่ม</Link>
        )}
      </div>

      {saved && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-900 dark:bg-green-950 dark:text-green-100">
          บันทึกแล้ว {savedRow?.req_no ?? ""}
        </p>
      )}

      <form className="flex flex-wrap gap-2">
        <select name="view" defaultValue={view} className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20">
          <option value="open">เฉพาะงานค้าง</option>
          <option value="all">ทั้งหมด</option>
        </select>
        <input name="q" defaultValue={q} placeholder="ค้นหา เลขที่ / ชื่อ / ระบบ / รายละเอียด"
          className="min-w-48 flex-1 rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20" />
        <button className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20">ค้นหา</button>
      </form>

      {error && <p className="text-sm text-red-600">{error.message}</p>}

      <p className="text-xs opacity-60">{rows.length} รายการ</p>
      <ul className="divide-y divide-black/5 rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/15">
        {rows.length === 0 && <li className="px-4 py-6 text-center text-sm opacity-60">{view === "open" ? "ไม่มีงานค้าง" : "ยังไม่มีข้อมูล"}</li>}
        {rows.map((r) => {
          const open = OPEN_STATUSES.includes(r.status);
          return (
            <li key={r.id}>
              <Link href={`/service/${r.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-black/[.03] dark:hover:bg-white/[.04]">
                <span className={`mt-0.5 rounded px-1.5 py-0.5 text-xs font-semibold ${PRIORITY_TONE[r.priority] ?? ""}`}>{r.priority}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium">{r.req_no}</span>
                    <span className="text-sm opacity-70">{r.requester}</span>
                    {r.system && <span className="text-xs opacity-50">· {r.system}</span>}
                  </div>
                  {r.detail && <p className="truncate text-sm opacity-80">{r.detail}</p>}
                  <p className="text-xs opacity-50">
                    {thDate(r.req_date)} · {r.type}
                    {open ? ` · ค้าง ${daysBetween(r.req_date, today)} วัน` : r.hours != null ? ` · ${r.hours} ชม.` : ""}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${STATUS_TONE[r.status] ?? ""}`}>{r.status}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
