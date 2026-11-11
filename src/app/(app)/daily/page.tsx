import Link from "next/link";
import { getSession } from "@/lib/supabase/server";
import { ChevronRight } from "lucide-react";
import { addDays, isISODate, shortThaiDate, todayISO } from "@/lib/dates";
import { recordedLate, type DailyRow } from "./checks";
import DailyForm from "./DailyForm";

const DOW = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

export default async function DailyPage(props: PageProps<"/daily">) {
  const sp = await props.searchParams;
  const today = todayISO();
  const date = isISODate(sp.date) && sp.date <= today ? sp.date : today;

  const { supabase, role } = await getSession();
  const [{ data: recent }, { data: users }, { data: first }] = await Promise.all([
    supabase.from("daily_check").select("*").gte("check_date", addDays(today, -20)).order("check_date", { ascending: false }),
    supabase.from("list_items").select("value").eq("list_key", "user").eq("active", true).order("sort"),
    supabase.from("daily_check").select("check_date").order("check_date").limit(1).maybeSingle(),
  ]);
  const rows = (recent ?? []) as DailyRow[];
  let existing = rows.find((r) => r.check_date === date) ?? null;
  if (!existing) {
    const { data } = await supabase.from("daily_check").select("*").eq("check_date", date).maybeSingle();
    existing = (data as DailyRow | null) ?? null;
  }

  // Last 14 working days (Sundays have no check, same rule as the Dashboard heatmap), including days
  // with no record so a missed check shows up and can be back-dated. Today counts only once it is saved.
  const since = first?.check_date ?? today;
  const byDate = new Map(rows.map((r) => [r.check_date, r]));
  const days: { iso: string; r: DailyRow | null }[] = [];
  for (let d = today; days.length < 14 && d >= since; d = addDays(d, -1)) {
    if (new Date(`${d}T00:00:00Z`).getUTCDay() === 0) continue;
    const r = byDate.get(d) ?? null;
    if (d === today && !r) continue;
    days.push({ iso: d, r });
  }
  const full = days.filter((x) => x.r?.complete === 1 && !x.r.ng_count).length;
  const ng = days.filter((x) => x.r && x.r.ng_count > 0).length;
  const missed = days.filter((x) => !x.r).length;

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
          <h2 className="h3">14 วันล่าสุด</h2>
          <span className="small muted">
            ครบ {full} · ไม่ครบ {days.length - full - ng - missed} · NG {ng}{missed > 0 && ` · ไม่ได้เช็ค ${missed}`}
          </span>
        </div>
        {days.length === 0 ? <p className="muted">ยังไม่มีข้อมูล</p> : (
          <div>
            {days.map(({ iso, r }) => (
              <Link key={iso} href={`/daily?date=${iso}`} className="li" aria-current={iso === date ? "page" : undefined}
                style={{ minHeight: 44, padding: "8px 0", ...(iso === date ? { background: "var(--hover)", margin: "0 -8px", padding: "8px" } : {}) }}>
                <div style={{ width: 32 }} className="small muted">{DOW[new Date(`${iso}T00:00:00Z`).getUTCDay()]}</div>
                <div className="flex-1" style={{ fontWeight: 600 }}>
                  {shortThaiDate(iso)}
                  {r && recordedLate(r) && <span className="small muted" style={{ fontWeight: 500 }}> · บันทึกย้อนหลัง</span>}
                </div>
                {!r ? <span className="pill sm t-grey">ไม่ได้เช็ค</span>
                  : r.ng_count > 0 ? <span className="pill sm t-bad">NG {r.ng_count} ข้อ</span>
                  : r.complete === 1 ? <span className="pill sm t-ok">✓ ครบ 7/7</span> : <span className="pill sm t-warn">ไม่ครบ</span>}
                <ChevronRight className="size-4 shrink-0 muted" aria-hidden="true" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
