import Link from "next/link";
import {
  AlarmClock, CalendarCheck, ClipboardCheck, Clock3, Inbox, Plus, Siren, TriangleAlert, type LucideIcon,
} from "lucide-react";
import { getSession } from "@/lib/supabase/server";
import { daysBetween, longThaiDate, thDate, todayISO } from "@/lib/dates";
import { PRIORITY_TONE, STATUS_TONE } from "./service/shared";
import { ASSET_STATUSES } from "./assets/shared";
import { assetHealth, WARRANTY_DAYS } from "@/lib/asset-health";

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

const card = "card p-4 sm:p-5";
const MAINT_TONE: Record<string, string> = {
  OK: "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-100",
  "DUE SOON": "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  OVERDUE: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100",
  "NOT DONE": "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100",
};

type Tone = "warn" | "bad" | "good" | "info";
const TONE: Record<Tone, { chip: string; tag: string; text: string }> = {
  good: { chip: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400", tag: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300", text: "ปกติ" },
  warn: { chip: "bg-amber-500/15 text-amber-600 dark:text-amber-400", tag: "bg-amber-500/15 text-amber-800 dark:text-amber-300", text: "ต้องดู" },
  bad: { chip: "bg-red-500/12 text-red-600 dark:text-red-400", tag: "bg-red-500/12 text-red-700 dark:text-red-300", text: "เร่งด่วน" },
  info: { chip: "bg-brand-soft text-brand", tag: "", text: "" },
};

// Big-number tile. Tone is carried by the icon chip AND a text tag, never colour alone.
function Kpi({ label, value, sub, tone = "info", icon: Icon, href }: {
  label: string; value: string | number; sub: string; tone?: Tone; icon: LucideIcon; href?: string;
}) {
  const t = TONE[tone];
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className={`grid size-9 place-items-center rounded-xl ${t.chip}`}><Icon className="size-[18px]" strokeWidth={2} /></span>
        {t.text && <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${t.tag}`}>{t.text}</span>}
      </div>
      <div className="mt-3 text-3xl font-bold leading-none tracking-tight tabular-nums sm:text-4xl">{value}</div>
      <div className="mt-1.5 text-sm font-medium">{label}</div>
      <div className="mt-0.5 truncate text-xs text-muted">{sub}</div>
    </>
  );
  return href
    ? <Link href={href} className="card block p-4 transition-shadow hover:shadow-md sm:p-5">{body}</Link>
    : <div className="card p-4 sm:p-5">{body}</div>;
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
      <div className="mt-1 flex gap-2 border-t border-[var(--line-strong)] pt-1">
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
  const [{ data, error }, ah] = await Promise.all([
    supabase.rpc("dashboard", { report_date: today }),
    assetHealth(supabase, today),
  ]);
  if (error || !data) return <main className="mx-auto max-w-3xl px-4 py-8 text-sm text-red-600">โหลดภาพรวมไม่ได้: {error?.message}</main>;
  const d = data as Dash;
  const { service: s, backlog: bl, checks: ck, maintenance: mt } = d;
  const p1 = bl.by_priority.find((x) => x.priority === "P1")?.open ?? 0;
  const pct = ck.working_days > 0 ? Math.min(1, ck.days_complete / ck.working_days) : null;
  const dailyDone = d.heat[today]?.c === 1;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-4 px-3 py-4 sm:space-y-5 sm:px-6 sm:py-6">
      {/* hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#163a5a] via-[#1f4e78] to-[#2a78d6] p-5 text-white shadow-lg sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-sky-100/80">{longThaiDate(today)}</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">ภาพรวมงาน IT</h1>
            <p className="mt-1 text-sm text-sky-100/80">สัปดาห์ {thDate(d.period.week_start)} – {thDate(d.period.week_end)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/daily" className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium backdrop-blur ${dailyDone ? "bg-white/15" : "bg-white text-[#163a5a]"}`}>
              <ClipboardCheck className="size-4" /> {dailyDone ? "เช็ควันนี้แล้ว" : "เช็ครายวัน"}
            </Link>
            <Link href="/service/new" className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-sm font-medium backdrop-blur hover:bg-white/25">
              <Plus className="size-4" /> แจ้งปัญหา
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6">
        <Kpi icon={Inbox} label="งานค้าง" value={bl.total} href="/service" sub={`รอ HQ/Vendor ${bl.waiting} · นานสุด ${bl.oldest_days ?? 0} วัน`} tone={bl.total > 0 ? "warn" : "good"} />
        <Kpi icon={Siren} label="P1 เปิดอยู่" value={p1} href="/service" sub="วิกฤต ต้องแก้ทันที" tone={p1 > 0 ? "bad" : "good"} />
        <Kpi icon={CalendarCheck} label="คำขอสัปดาห์นี้" value={s.week.received} sub={`เดือนนี้ ${s.month.received} · ปิด ${s.month.closed}`} />
        <Kpi icon={TriangleAlert} label="Incident เดือนนี้" value={s.month.incidents} sub={`สัปดาห์นี้ ${s.week.incidents} · ส่งต่อ ${s.month.escalated}`} tone={s.month.incidents > 0 ? "warn" : "info"} />
        <Kpi icon={Clock3} label="เวลาแก้เฉลี่ย (ชม.)" value={s.month.avg_hours ?? "–"} sub={`สัปดาห์นี้ ${s.week.avg_hours ?? "–"}`} />
        <Kpi icon={AlarmClock} label="Daily Check ครบ" value={pct == null ? "–" : `${Math.round(pct * 100)}%`} href="/daily" sub={`${ck.days_complete}/${ck.working_days} วันทำงาน`} tone={pct != null && pct < 1 ? "warn" : "good"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={card}>
          <h2 className="mb-3 font-semibold">คำขอรายสัปดาห์ <span className="text-xs font-normal opacity-60">(8 สัปดาห์)</span></h2>
          <Trend weeks={d.trend} />
        </section>
        <section className={card}>
          <h2 className="mb-3 font-semibold">Daily Check <span className="text-xs font-normal opacity-60">(16 สัปดาห์)</span></h2>
          <Heat heat={d.heat} weekStart={d.period.week_start} today={today} />
          <p className="mt-3 text-xs opacity-70">
            NG สัปดาห์นี้ {ck.ng_week} · เดือนนี้ {ck.ng_month} · Weekly check สัปดาห์นี้: {ck.weekly_done ? "ทำแล้ว" : "ยังไม่ทำ"} · Backup ล่าสุด: {ck.latest_backup ?? "–"}
            {ck.lowest_disk != null && ` · ดิสก์ว่างต่ำสุด ${ck.lowest_disk}%`}
          </p>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={card}>
          <h2 className="mb-2 font-semibold">งานค้าง <span className="text-xs font-normal opacity-60">(เก่าสุดก่อน)</span></h2>
          {d.open.length === 0 ? <p className="text-sm opacity-60">ไม่มีงานค้าง</p> : (
            <ul className="divide-y divide-[var(--line)]">
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
          <h2 className="mb-2 font-semibold">สถานะ Maintenance</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-xs opacity-60"><tr><th className="py-1">ประเภท</th><th>ผ่านล่าสุด</th><th>ครบกำหนด</th><th>สถานะ</th></tr></thead>
            <tbody>
              {mt.types.map((m) => (
                <tr key={m.type} className="border-t border-[var(--line)]">
                  <td className="py-1.5 pr-2">{m.type}<div className="text-xs opacity-50">ทุก {m.every_months} เดือน</div></td>
                  <td>{thDate(m.last_pass) || "–"}</td>
                  <td>{thDate(m.next_due) || "–"}</td>
                  <td><span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${MAINT_TONE[m.status] ?? ""}`}>{m.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs opacity-70">รอเซ็นรับรองรายไตรมาส {mt.pending_signoff} · ทดสอบไม่ผ่านเดือนนี้ {mt.failed_month}</p>
        </section>
      </div>

      <section className={card}>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">ทรัพย์สิน IT <span className="text-xs font-normal opacity-60">รวม {ah.total}</span></h2>
          <Link href="/assets" className="text-xs opacity-70 hover:underline">ดูทั้งหมด →</Link>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          {ASSET_STATUSES.filter((s) => ah.byStatus[s.v]).map((s) => (
            <Link key={s.v} href={`/assets?status=${encodeURIComponent(s.v)}`} className={`rounded-full px-3 py-1 text-sm ${s.tone}`}>
              {s.th} <b className="tabular-nums">{ah.byStatus[s.v]}</b>
            </Link>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <h3 className="mb-1 text-sm font-medium">ประกันหมด / ใกล้หมด <span className="text-xs font-normal opacity-60">(≤ {WARRANTY_DAYS} วัน)</span></h3>
            {ah.warranty.length === 0 ? (
              <p className="text-sm opacity-60">ไม่มี{ah.total ? " — กรอกวันหมดประกันในหน้าทรัพย์สินเพื่อให้ระบบเตือน" : ""}</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {ah.warranty.slice(0, 6).map((w) => (
                  <li key={w.id}>
                    <Link href={`/assets/${w.id}`} className="flex gap-2 hover:underline">
                      <span className="font-mono">{w.asset_tag}</span>
                      <span className="min-w-0 flex-1 truncate opacity-70">{w.label}</span>
                      <span className={`shrink-0 text-xs ${w.days < 0 ? "font-semibold text-red-600" : "text-amber-700 dark:text-amber-400"}`}>
                        {w.days < 0 ? `หมดแล้ว ${-w.days} วัน` : `อีก ${w.days} วัน`}
                      </span>
                    </Link>
                  </li>
                ))}
                {ah.warranty.length > 6 && <li><Link href="/assets?warranty=soon" className="text-xs opacity-70 hover:underline">และอีก {ah.warranty.length - 6} รายการ →</Link></li>}
              </ul>
            )}
          </div>
          <div>
            <h3 className="mb-1 text-sm font-medium">ยังไม่มี Serial No.</h3>
            <p className="text-2xl font-semibold tabular-nums">{ah.missingSerial.length}
              <span className="ml-1 text-xs font-normal opacity-60">จากเครื่องที่ใช้งาน/สต็อก/ซ่อม</span></p>
            {ah.missingSerial.length > 0 && (
              <Link href="/assets?missing=serial" className="text-xs opacity-70 hover:underline">ดูรายการแล้วเติม S/N →</Link>
            )}
          </div>
          <div>
            <h3 className="mb-1 text-sm font-medium">แจ้งปัญหาบ่อย <span className="text-xs font-normal opacity-60">(12 เดือน)</span></h3>
            {ah.topRepairs.length === 0 ? <p className="text-sm opacity-60">ยังไม่มีคำขอที่ผูกกับเครื่อง</p> : (
              <ul className="space-y-1 text-sm">
                {ah.topRepairs.map((r) => (
                  <li key={r.id}>
                    <Link href={`/assets/${r.id}`} className="flex gap-2 hover:underline">
                      <span className="font-mono">{r.asset_tag}</span>
                      <span className="min-w-0 flex-1 truncate opacity-70">{r.user_name ?? r.label}</span>
                      <span className="shrink-0 tabular-nums">{r.count} ครั้ง</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className={card}>
        <h2 className="mb-2 font-semibold">คำขอตามประเภท</h2>
        <table className="w-full max-w-md text-sm">
          <thead className="text-left text-xs opacity-60"><tr><th className="py-1">ประเภท</th><th className="text-right">สัปดาห์นี้</th><th className="text-right">เดือนนี้</th></tr></thead>
          <tbody>
            {d.by_type.map((t) => (
              <tr key={t.type} className="border-t border-[var(--line)]">
                <td className="py-1.5">{t.type}</td><td className="text-right tabular-nums">{t.week}</td><td className="text-right tabular-nums">{t.month}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
