import Link from "next/link";
import { CalendarClock, Plus, Stamp, User } from "lucide-react";
import { getSession } from "@/lib/supabase/server";
import { shortThaiDate, thDate, todayISO } from "@/lib/dates";
import { addMonths, maintStatus, needsSignoff, type MaintRow, type MaintType } from "./shared";

export default async function MaintenancePage(props: PageProps<"/maintenance">) {
  const sp = await props.searchParams;
  const saved = typeof sp.saved === "string" ? Number(sp.saved) : null;
  const today = todayISO();
  const { supabase, role } = await getSession();
  const [{ data: types }, { data: recs }] = await Promise.all([
    supabase.from("maint_types").select("name, every_months").order("sort"),
    supabase.from("maintenance_v").select("*").order("done_date", { ascending: false }).order("id", { ascending: false }).limit(200),
  ]);
  const rows = (recs ?? []) as MaintRow[];
  const pending = rows.filter((r) => needsSignoff(r.type) && !r.approved_by);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-3 py-3 sm:gap-4 sm:px-5 sm:py-5 lg:px-7">
      {saved && <p className="banner info small">บันทึกแล้ว</p>}
      {pending.length > 0 && (
        <p className="banner warn small"><Stamp className="size-4 shrink-0" />รายไตรมาสรอหัวหน้าเซ็นรับรอง {pending.length} รายการ — เปิดรายการแล้วใส่ชื่อและวันที่รับรอง</p>
      )}

      {/* status per maintenance type */}
      <div className="grid gap-3 sm:grid-cols-2">
        {((types ?? []) as MaintType[]).map((t) => {
          const lastPass = rows.find((r) => r.type === t.name && r.result === "Pass")?.done_date ?? null;
          const next = lastPass ? addMonths(lastPass, t.every_months) : null;
          const st = maintStatus(lastPass, next, today);
          return (
            <section key={t.name} className="card !p-4">
              <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
                <span className="kchip"><CalendarClock className="size-[18px]" /></span>
                <div className="min-w-0 flex-1">
                  <div className="h3">{t.name}</div>
                  <div className="small muted">ทุก {t.every_months} เดือน</div>
                </div>
                <span className={`pill sm ${st.tone}`}>{st.th}</span>
              </div>
              <dl className="kv mt-3">
                <dt>ผ่านล่าสุด</dt><dd>{lastPass ? thDate(lastPass) : "–"}</dd>
                <dt>ครบกำหนด</dt><dd>{next ? thDate(next) : "–"}</dd>
              </dl>
              {role === "editor" && (
                <Link href={`/maintenance/new?type=${encodeURIComponent(t.name)}`} className="btn btn-secondary btn-sm btn-block mt-3"><Plus className="size-4" />บันทึกงานนี้</Link>
              )}
            </section>
          );
        })}
      </div>

      <section className="card !p-4">
        <div className="card-h">
          <h2 className="h3">ประวัติการทำ <span className="muted small font-normal">{rows.length} รายการ</span></h2>
          {role === "editor" && <Link href="/maintenance/new" className="btn btn-primary btn-sm"><Plus className="size-4" />บันทึก</Link>}
        </div>
        {rows.length === 0 ? <p className="muted">ยังไม่มีบันทึก — กด “บันทึกงานนี้” ที่การ์ดด้านบน</p> : rows.map((r) => (
          <Link key={r.id} href={`/maintenance/${r.id}`} className="li">
            <span className={`pill sm ${r.result === "Pass" ? "t-ok" : "t-bad"}`}>{r.result}</span>
            <div className="min-w-0 flex-1">
              <div className="t truncate">{r.type}</div>
              <div className="m">
                <span>{shortThaiDate(r.done_date)}</span><span className="dot-sep" />
                <span className="row" style={{ gap: 4 }}><User className="size-3.5" />{r.done_by}</span>
                {r.scope && <><span className="dot-sep" /><span className="truncate">{r.scope}</span></>}
              </div>
            </div>
            {needsSignoff(r.type) && (r.approved_by
              ? <span className="pill sm t-ok">รับรองแล้ว</span>
              : <span className="pill sm t-warn">รอเซ็น</span>)}
          </Link>
        ))}
      </section>
    </main>
  );
}
