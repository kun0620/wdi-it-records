import Link from "next/link";
import { getSession } from "@/lib/supabase/server";
import { addDays, isISODate, mondayOf, shortThaiDate, todayISO } from "@/lib/dates";
import WeeklyForm from "./WeeklyForm";
import { BACKUP, LOW_DISK, type WeeklyRow } from "./shared";

export default async function WeeklyPage(props: PageProps<"/weekly">) {
  const sp = await props.searchParams;
  const thisWeek = mondayOf(todayISO());
  const week = isISODate(sp.week) ? mondayOf(sp.week) : thisWeek;
  const wk = week > thisWeek ? thisWeek : week;

  const { supabase, role } = await getSession();
  const [{ data: recent }, { data: users }, { data: cur }] = await Promise.all([
    supabase.from("weekly_check").select("*").order("week_start", { ascending: false }).limit(12),
    supabase.from("list_items").select("value").eq("list_key", "user").eq("active", true).order("sort"),
    supabase.from("weekly_check").select("*").eq("week_start", wk).maybeSingle(),
  ]);
  const rows = (recent ?? []) as WeeklyRow[];
  const existing = (cur as WeeklyRow | null) ?? null;
  const disk = (n: number | null) => n == null ? <span className="muted">–</span>
    : <span className={`mono ${n < LOW_DISK ? "font-bold text-[var(--bad-fg)]" : ""}`}>{n}%</span>;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-3 py-3 sm:gap-4 sm:px-5 sm:py-5 lg:px-7">
      <WeeklyForm
        key={wk}
        week={wk}
        weekEnd={addDays(wk, 6)}
        maxWeek={thisWeek}
        existing={existing}
        defaultChecker={existing?.checker ?? rows[0]?.checker ?? ""}
        users={(users ?? []).map((u) => u.value)}
        canEdit={role === "editor"}
      />

      <section className="card !p-4">
        <div className="card-h">
          <h2 className="h3">12 สัปดาห์ล่าสุด</h2>
          <span className="small muted">ดิสก์ต่ำกว่า {LOW_DISK}% เป็นสีแดง</span>
        </div>
        {rows.length === 0 ? <p className="muted">ยังไม่มีข้อมูล</p> : (
          <div className="overflow-x-auto">
            <table className="tbl plain">
              <thead><tr><th>สัปดาห์</th><th>Backup</th><th>Server</th><th>NVR</th><th>AD ล็อก</th><th>AD ไม่ใช้</th><th>ไม่ลงแพตช์</th><th>ผู้ตรวจ</th></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const b = BACKUP.find((x) => x.v === r.backup);
                  return (
                    <tr key={r.week_start}>
                      <td><Link href={`/weekly?week=${r.week_start}`} className="link">{shortThaiDate(r.week_start)}</Link></td>
                      <td><span className={`pill sm ${b?.tone ?? "t-grey"}`}>{b?.th ?? r.backup}</span></td>
                      <td>{disk(r.disk_srv)}</td>
                      <td>{disk(r.disk_nvr)}</td>
                      <td className="mono">{r.ad_locked ?? "–"}</td>
                      <td className="mono">{r.ad_inactive ?? "–"}</td>
                      <td className="mono">{r.unpatched ?? "–"}</td>
                      <td>{r.checker}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
