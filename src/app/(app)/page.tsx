import Link from "next/link";
import { getSession } from "@/lib/supabase/server";
import { daysBetween, thDate, todayISO } from "@/lib/dates";
import { PRIORITY_TONE, STATUS_TONE } from "./service/shared";
import { statusOf } from "./assets/shared";

type Period = { received: number; incidents: number; p1: number; closed: number; escalated: number; avg_hours: number | null };
type Dash = {
  period: { date: string; week_start: string; week_end: string; month_start: string; month_end: string };
  service: { week: Period; month: Period };
  backlog: { by_priority: { priority: string; open: number; oldest_days: number | null }[]; total: number; oldest_days: number | null; waiting: number };
  open: { id: number; req_no: string; req_date: string; requester: string; priority: string; status: string; detail: string | null }[];
  by_type: { type: string; week: number; month: number }[];
  checks: { working_days: number; days_complete: number; ng_week: number; ng_month: number; weekly_done: boolean; latest_backup: string | null; lowest_disk: number | null };
  maintenance: { types: { type: string; every_months: number; last_pass: string | null; next_due: string | null; status: string }[]; pending_signoff: number; failed_month: number };
  assets: Record<string, number>;
  trend: { week_start: string; total: number; incidents: number }[];
  heat: Record<string, { c: number; ng: number }>;
};

const card = "rounded-xl border border-black/10 p-4 dark:border-white/15";
const MAINT_TONE: Record<string, string> = {
  OK: "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-100",
  "DUE SOON": "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  OVERDUE: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100",
  "NOT DONE": "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100",
};

function Kpi({ label, value, sub, tone }: { label: string; value: string | number; sub: string; tone?: "warn" | "bad" | "good" }) {
  const bar = tone === "bad" ? "border-l-[var(--status-critical)]" : tone === "warn" ? "border-l-[var(--status-warning)]" : tone === "good" ? "border-l-[var(--status-good)]" : "border-l-transparent";
  return (
    <div className={`${card} border-l-4 ${bar}`}>
      <div className="text-xs opacity-60">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs opacity-60">{sub}</div>
    </div>
  );
}

// 8-week requests, stacked: general (series-1) + incidents (series-2); one y-scale, 2px gap between segments.
function Trend({ weeks }: { weeks: Dash["trend"] }) {
  const max = Math.max(1, ...weeks.map((w) => w.total));
  return (
    <div>
      <div className="flex h-36 items-end gap-2" role="img" aria-label="คำขอรายสัปดาห์ 8 สัปดาห์">
        {weeks.map((w) => (
          <div key={w.week_start} className="flex h-full flex-1 flex-col items-center justify-end gap-1"
            title={`สัปดาห์ ${thDate(w.week_start)}: ทั้งหมด ${w.total} · Incident ${w.incidents}`}>
            <span className="text-xs tabular-nums opacity-70">{w.total || ""}</span>
            <div className="flex w-full max-w-8 flex-col justify-end gap-[2px]" style={{ height: `${(w.total / max) * 100}%` }}>
              {w.incidents > 0 && <div className="rounded-t-[4px] bg-[var(--series-2)]" style={{ flex: w.incidents }} />}
              {w.total - w.incidents > 0 && <div className={`bg-[var(--series-1)] ${w.incidents ? "" : "rounded-t-[4px]"}`} style={{ flex: w.total - w.incidents }} />}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-2 border-t border-black/10 pt-1 dark:border-white/15">
        {weeks.map((w) => <span key={w.week_start} className="flex-1 text-center text-[10px] opacity-60">{thDate(w.week_start).slice(0, 5)}</span>)}
      </div>
      <div className="mt-2 flex gap-4 text-xs opacity-80">
        <span className="flex items-center gap-1"><i className="inline-block size-2.5 rounded-sm bg-[var(--series-1)]" />คำขอทั่วไป</span>
        <span className="flex items-center gap-1"><i className="inline-block size-2.5 rounded-sm bg-[var(--series-2)]" />Incident</span>
      </div>
    </div>
  );
}

// Daily Check, last 16 weeks (Mon→Sun columns): status color + text legend, title tooltip per day.
function Heat({ heat, weekStart, today }: { heat: Dash["heat"]; weekStart: string; today: string }) {
  const start = new Date(`${weekStart}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 7 * 15);
  const weeks = Array.from({ length: 16 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const dt = new Date(start);
      dt.setUTCDate(dt.getUTCDate() + w * 7 + d);
      return dt.toISOString().slice(0, 10);
    }),
  );
  const cell = (day: string) => {
    const r = heat[day];
    if (day > today) return { cls: "opacity-0", tip: "" };
    if (!r) return { cls: "bg-[var(--cell-empty)]", tip: "ไม่ได้เช็ค" };
    if (r.ng > 0) return { cls: "bg-[var(--status-critical)]", tip: `NG ${r.ng}` };
    return r.c === 1 ? { cls: "bg-[var(--status-good)]", tip: "ครบ" } : { cls: "bg-[var(--status-warning)]", tip: "ไม่ครบ" };
  };
  return (
    <div>
      <div className="flex gap-[3px] overflow-x-auto">
        {weeks.map((wk) => (
          <div key={wk[0]} className="flex flex-col gap-[3px]">
            {wk.map((day) => {
              const c = cell(day);
              return <span key={day} title={c.tip && `${thDate(day)} · ${c.tip}`} className={`block size-3.5 rounded-[3px] ${c.cls}`} />;
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs opacity-80">
        {[["--status-good", "ครบ"], ["--status-warning", "ไม่ครบ"], ["--status-critical", "พบ NG"], ["--cell-empty", "ไม่ได้เช็ค"]].map(([v, l]) => (
          <span key={l} className="flex items-center gap-1"><i className="inline-block size-2.5 rounded-sm" style={{ background: `var(${v})` }} />{l}</span>
        ))}
      </div>
    </div>
  );
}

export default async function Dashboard() {
  const { supabase } = await getSession();
  const today = todayISO();
  const { data, error } = await supabase.rpc("dashboard", { report_date: today });
  if (error || !data) return <main className="mx-auto max-w-3xl px-4 py-8 text-sm text-red-600">โหลดภาพรวมไม่ได้: {error?.message}</main>;
  const d = data as Dash;
  const { service: s, backlog: bl, checks: ck, maintenance: mt } = d;
  const p1 = bl.by_priority.find((x) => x.priority === "P1")?.open ?? 0;
  const pct = ck.working_days > 0 ? Math.min(1, ck.days_complete / ck.working_days) : null;
  const totalAssets = Object.values(d.assets).reduce((a, b) => a + b, 0);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-lg font-semibold">ภาพรวมงาน IT</h1>
        <span className="text-xs opacity-60">สัปดาห์ {thDate(d.period.week_start)} – {thDate(d.period.week_end)}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Kpi label="งานค้าง" value={bl.total} sub={`รอ HQ/Vendor ${bl.waiting} · ค้างนานสุด ${bl.oldest_days ?? 0} วัน`} tone={bl.total > 0 ? "warn" : "good"} />
        <Kpi label="P1 ที่เปิดอยู่" value={p1} sub="วิกฤต ต้องแก้ทันที" tone={p1 > 0 ? "bad" : "good"} />
        <Kpi label="คำขอสัปดาห์นี้" value={s.week.received} sub={`เดือนนี้ ${s.month.received} · ปิด ${s.month.closed}`} />
        <Kpi label="Incident เดือนนี้" value={s.month.incidents} sub={`สัปดาห์นี้ ${s.week.incidents} · ส่งต่อ ${s.month.escalated}`} tone={s.month.incidents > 0 ? "warn" : undefined} />
        <Kpi label="เวลาแก้เฉลี่ย (ชม.)" value={s.month.avg_hours ?? "–"} sub={`เดือนนี้ · สัปดาห์นี้ ${s.week.avg_hours ?? "–"}`} />
        <Kpi label="Daily Check ครบ" value={pct == null ? "–" : `${Math.round(pct * 100)}%`} sub={`${ck.days_complete} / ${ck.working_days} วันทำงาน`} tone={pct != null && pct < 1 ? "warn" : "good"} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className={card}>
          <h2 className="mb-3 font-medium">คำขอรายสัปดาห์ <span className="text-xs font-normal opacity-60">(8 สัปดาห์)</span></h2>
          <Trend weeks={d.trend} />
        </section>
        <section className={card}>
          <h2 className="mb-3 font-medium">Daily Check <span className="text-xs font-normal opacity-60">(16 สัปดาห์)</span></h2>
          <Heat heat={d.heat} weekStart={d.period.week_start} today={today} />
          <p className="mt-3 text-xs opacity-70">
            NG สัปดาห์นี้ {ck.ng_week} · เดือนนี้ {ck.ng_month} · Weekly check สัปดาห์นี้: {ck.weekly_done ? "ทำแล้ว" : "ยังไม่ทำ"} · Backup ล่าสุด: {ck.latest_backup ?? "–"}
            {ck.lowest_disk != null && ` · ดิสก์ว่างต่ำสุด ${ck.lowest_disk}%`}
          </p>
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className={card}>
          <h2 className="mb-2 font-medium">งานค้าง <span className="text-xs font-normal opacity-60">(เก่าสุดก่อน)</span></h2>
          {d.open.length === 0 ? <p className="text-sm opacity-60">ไม่มีงานค้าง</p> : (
            <ul className="divide-y divide-black/5 dark:divide-white/10">
              {d.open.map((r) => (
                <li key={r.id}>
                  <Link href={`/service/${r.id}`} className="flex items-center gap-2 py-2 text-sm">
                    <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${PRIORITY_TONE[r.priority] ?? ""}`}>{r.priority}</span>
                    <span className="font-medium">{r.req_no}</span>
                    <span className="min-w-0 flex-1 truncate opacity-70">{r.requester}{r.detail ? ` · ${r.detail}` : ""}</span>
                    <span className="text-xs tabular-nums opacity-60">{daysBetween(r.req_date, today)} วัน</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_TONE[r.status] ?? ""}`}>{r.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={card}>
          <h2 className="mb-2 font-medium">สถานะ Maintenance</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-xs opacity-60"><tr><th className="py-1">ประเภท</th><th>ผ่านล่าสุด</th><th>ครบกำหนด</th><th>สถานะ</th></tr></thead>
            <tbody>
              {mt.types.map((m) => (
                <tr key={m.type} className="border-t border-black/5 dark:border-white/10">
                  <td className="py-1.5 pr-2">{m.type}<div className="text-xs opacity-50">ทุก {m.every_months} เดือน</div></td>
                  <td>{thDate(m.last_pass) || "–"}</td>
                  <td>{thDate(m.next_due) || "–"}</td>
                  <td><span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${MAINT_TONE[m.status] ?? ""}`}>{m.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs opacity-70">รอเซ็นรับรองรายไตรมาส {mt.pending_signoff} · ทดสอบไม่ผ่านเดือนนี้ {mt.failed_month}</p>
          <h2 className="mb-1 mt-4 font-medium">ทรัพย์สิน IT <span className="text-xs font-normal opacity-60">รวม {totalAssets}</span></h2>
          <p className="text-sm opacity-80">{Object.entries(d.assets).map(([k, v]) => `${statusOf(k)?.th ?? k} ${v}`).join(" · ")}</p>
        </section>
      </div>

      <section className={card}>
        <h2 className="mb-2 font-medium">คำขอตามประเภท</h2>
        <table className="w-full max-w-md text-sm">
          <thead className="text-left text-xs opacity-60"><tr><th className="py-1">ประเภท</th><th className="text-right">สัปดาห์นี้</th><th className="text-right">เดือนนี้</th></tr></thead>
          <tbody>
            {d.by_type.map((t) => (
              <tr key={t.type} className="border-t border-black/5 dark:border-white/10">
                <td className="py-1.5">{t.type}</td><td className="text-right tabular-nums">{t.week}</td><td className="text-right tabular-nums">{t.month}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
