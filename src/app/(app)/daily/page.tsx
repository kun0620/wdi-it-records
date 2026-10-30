import Link from "next/link";
import { getSession } from "@/lib/supabase/server";
import { FileSpreadsheet } from "lucide-react";
import { addDays, isISODate, isoWeek, mondayOf, shortThaiDate, todayISO } from "@/lib/dates";
import { recordedLate, type DailyRow } from "./checks";
import DailyForm from "./DailyForm";

const DOW = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

export default async function DailyPage(props: PageProps<"/daily">) {
  const sp = await props.searchParams;
  const today = todayISO();
  const date = isISODate(sp.date) && sp.date <= today ? sp.date : today;

  const { supabase, role } = await getSession();
  const [{ data: recent }, { data: users }] = await Promise.all([
    supabase.from("daily_check").select("*").order("check_date", { ascending: false }).limit(14),
    supabase.from("list_items").select("value").eq("list_key", "user").eq("active", true).order("sort"),
  ]);
  const rows = (recent ?? []) as DailyRow[];
  let existing = rows.find((r) => r.check_date === date) ?? null;
  if (!existing) {
    const { data } = await supabase.from("daily_check").select("*").eq("check_date", date).maybeSingle();
    existing = (data as DailyRow | null) ?? null;
  }
  const thisMon = mondayOf(today);
  const full = rows.filter((r) => r.complete === 1 && !r.ng_count).length;
  const ng = rows.filter((r) => r.ng_count > 0).length;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-3 py-3 sm:gap-4 sm:px-5 sm:py-5 lg:px-7">
      <DailyForm
        key={date}
        date={date}
        today={today}
        existing={existing}
        defaultChecker={existing?.checker ?? rows[0]?.checker ?? ""}
        users={(users ?? []).map((u) => u.value)}
        canEdit={role === "editor"}
      />

      <section className="card !p-4">
        <div className="card-h">
          <h2 className="h3">รีพอทประจำสัปดาห์</h2>
          <span className="small muted">Excel · จ.–อา. ของสัปดาห์</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[thisMon, addDays(thisMon, -7)].map((m, i) => (
            <a key={m} href={`/daily/report?week=${m}`} className={`btn ${i === 0 ? "btn-primary" : "btn-secondary"}`}>
              <FileSpreadsheet className="size-4" />
              {i === 0 ? "สัปดาห์นี้" : "สัปดาห์ก่อน"} · W{isoWeek(m)} ({shortThaiDate(m)} – {shortThaiDate(addDays(m, 6))})
            </a>
          ))}
        </div>
      </section>

      <section className="card !p-4">
        <div className="card-h">
          <h2 className="h3">14 วันล่าสุด</h2>
          <span className="small muted">ครบ {full} · ไม่ครบ {rows.length - full - ng} · NG {ng}</span>
        </div>
        {rows.length === 0 ? <p className="muted">ยังไม่มีข้อมูล</p> : (
          <div>
            {rows.map((r) => (
              <Link key={r.check_date} href={`/daily?date=${r.check_date}`} className="li" style={{ padding: "10px 0" }}>
                <div style={{ width: 44 }} className="small muted">{DOW[new Date(`${r.check_date}T00:00:00Z`).getUTCDay()]}</div>
                <div className="flex-1" style={{ fontWeight: 600 }}>
                  {shortThaiDate(r.check_date)}
                  {recordedLate(r) && <span className="small muted" style={{ fontWeight: 500 }}> · บันทึกย้อนหลัง</span>}
                </div>
                {r.ng_count > 0
                  ? <span className="pill sm t-bad">NG {r.ng_count} ข้อ</span>
                  : r.complete === 1 ? <span className="pill sm t-ok">✓ ครบ 7/7</span> : <span className="pill sm t-warn">ไม่ครบ</span>}
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
