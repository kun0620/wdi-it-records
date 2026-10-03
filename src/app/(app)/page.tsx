import { Fragment } from "react";
import Link from "next/link";
import {
  AlarmClock, CalendarDays, ChevronRight, ClipboardCheck, Clock3, Inbox, Plus, Siren, TriangleAlert, Wrench, type LucideIcon,
} from "lucide-react";
import { getSession } from "@/lib/supabase/server";
import { daysBetween, isoWeek, longThaiDate, shortThaiDate, thaiMonth, thDate, todayISO } from "@/lib/dates";
import { assetHealth, WARRANTY_DAYS } from "@/lib/asset-health";
import { ASSET_STATUSES } from "./assets/shared";

type Period = { received: number; incidents: number; p1: number; closed: number; escalated: number; avg_hours: number | null };
type Dash = {
  period: { date: string; week_start: string; week_end: string; month_start: string; month_end: string };
  service: { week: Period; month: Period };
  backlog: { by_priority: { priority: string; open: number; oldest_days: number | null }[]; total: number; oldest_days: number | null; waiting: number };
  open: { id: number; req_no: string; req_date: string; requester: string; priority: string; status: string; detail: string | null; system: string | null }[];
  by_type: { type: string; week: number; month: number }[];
  checks: { working_days: number; days_complete: number; ng_week: number; ng_month: number; weekly_done: boolean; latest_backup: string | null; lowest_disk: number | null };
  maintenance: { types: { type: string; every_months: number; last_pass: string | null; next_due: string | null; status: string }[]; pending_signoff: number; failed_month: number };
  trend: { week_start: string; total: number; incidents: number }[];
  heat: Record<string, { c: number; ng: number }>;
};

// pill tone per design: t-ok / t-info / t-warn / t-orange / t-grey / t-bad / t-violet
const SERVICE_TONE: Record<string, string> = { Open: "t-info", "In Progress": "t-warn", "Waiting HQ/Vendor": "t-orange", Closed: "t-ok", Cancelled: "t-grey" };
const MAINT_TONE: Record<string, string> = { OK: "t-ok", "DUE SOON": "t-warn", OVERDUE: "t-bad", "NOT DONE": "t-bad" };
const STATUS_TONE: Record<string, string> = { "In Use": "t-ok", "In Stock": "t-info", Repair: "t-warn", Waiting: "t-orange", Retired: "t-grey", Lost: "t-bad", Planned: "t-violet" };
const TAG = { ok: ["t-ok", "ปกติ"], warn: ["t-warn", "ต้องดู"], bad: ["t-bad", "เร่งด่วน"] } as const;

function Kpi({ icon: Icon, chip, tag, num, unit, label, sub, href }: {
  icon: LucideIcon; chip?: "ok" | "warn" | "orange" | "violet" | "bad"; tag?: keyof typeof TAG;
  num: string | number; unit?: string; label: string; sub: string; href?: string;
}) {
  const body = (
    <>
      <div className="top">
        <span className={`kchip ${chip === "bad" ? "" : chip ?? ""}`} style={chip === "bad" ? { background: "var(--bad-bg)", color: "var(--bad-fg)" } : undefined}>
          <Icon className="size-[18px]" strokeWidth={2} />
        </span>
        {tag && <span className={`pill sm ${TAG[tag][0]}`}>{TAG[tag][1]}</span>}
      </div>
      <div className="num">{num}{unit && <small>{unit}</small>}</div>
      <div className="lbl">{label}</div>
      <div className="sub truncate">{sub}</div>
    </>
  );
  return href ? <Link href={href} className="kpi transition-shadow hover:shadow-[var(--shadow2)]">{body}</Link> : <div className="kpi">{body}</div>;
}

// 8-week requests: general (barA) under incidents (barB), dashed gridlines, current week highlighted.
function Bars({ weeks }: { weeks: Dash["trend"] }) {
  const max = Math.max(4, ...weeks.map((w) => w.total));
  const top = Math.ceil(max / 2) * 2;
  const H = 150;
  const px = (n: number) => Math.round((n / top) * H);
  return (
    <div style={{ paddingLeft: 18 }}>
      <div className="bars" style={{ height: H + 22 }} role="img"
        aria-label={`คำขอรายสัปดาห์ 8 สัปดาห์: ${weeks.map((w) => `${shortThaiDate(w.week_start)} ${w.total}`).join(", ")}`}>
        {[0, top / 2, top].map((g) => <div key={g} className="gl" style={{ bottom: px(g) }}><span>{g}</span></div>)}
        {weeks.map((w, i) => {
          const gen = w.total - w.incidents;
          return (
            <div key={w.week_start} className={`bar ${i === weeks.length - 1 ? "cur" : ""}`} title={`${shortThaiDate(w.week_start)}: ${w.total} งาน (Incident ${w.incidents})`}>
              <span className="v">{w.total || ""}</span>
              {w.incidents > 0 && <div className="sb" style={{ height: px(w.incidents) }} />}
              {gen > 0 && <div className={`sa ${w.incidents ? "" : "solo"}`} style={{ height: px(gen) }} />}
            </div>
          );
        })}
      </div>
      <div className="xl">
        {weeks.map((w, i) => (
          <span key={w.week_start} className={`min-w-0 ${i === weeks.length - 1 ? "cur" : ""}`}>
            <span className="hidden sm:inline">{shortThaiDate(w.week_start)}</span>
            <span className="sm:hidden">{Number(w.week_start.slice(8))}/{Number(w.week_start.slice(5, 7))}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// Daily Check, 16 weeks x Mon..Sun, month labels on top, day labels on the left.
function Heat({ heat, weekStart, today }: { heat: Dash["heat"]; weekStart: string; today: string }) {
  const start = new Date(`${weekStart}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 7 * 15);
  const day = (w: number, d: number) => {
    const dt = new Date(start);
    dt.setUTCDate(dt.getUTCDate() + w * 7 + d);
    return dt.toISOString().slice(0, 10);
  };
  const weeks = Array.from({ length: 16 }, (_, w) => w);
  const cls = (iso: string, d: number) => {
    if (iso > today) return "fut";
    const r = heat[iso];
    if (r) return r.ng > 0 ? "bad" : r.c === 1 ? "ok" : "warn";
    return d === 6 ? "" : "none";            // Sunday = no work, otherwise a missed check
  };
  return (
    <div className="hm" role="img" aria-label="Daily Check 16 สัปดาห์" style={{ gridTemplateColumns: "22px repeat(16, minmax(0, 18px))", gap: 4 }}>
      <span />
      {weeks.map((w) => {
        const first = day(w, 0), prev = w ? day(w - 1, 0) : "";
        return <span key={w} className="ml">{!prev || thaiMonth(first) !== thaiMonth(prev) ? thaiMonth(first) : ""}</span>;
      })}
      {["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map((dl, d) => (
        <Fragment key={dl}>
          <span className="dl">{dl}</span>
          {weeks.map((w) => {
            const iso = day(w, d);
            const c = cls(iso, d);
            return (
              <span key={iso} className={`c ${c} ${iso === today ? "today" : ""}`} style={{ aspectRatio: "1" }}
                title={`${thDate(iso)}${heat[iso] ? (heat[iso].ng ? ` · NG ${heat[iso].ng}` : heat[iso].c ? " · ครบ" : " · ไม่ครบ") : c === "none" ? " · ไม่ได้เช็ค" : ""}`}>
                {c === "bad" ? "!" : ""}
              </span>
            );
          })}
        </Fragment>
      ))}
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
  if (error || !data) return <main className="mx-auto max-w-3xl px-4 py-8 text-sm text-[var(--bad-fg)]">โหลดภาพรวมไม่ได้: {error?.message}</main>;
  const d = data as Dash;
  const { service: s, backlog: bl, checks: ck, maintenance: mt } = d;
  const p1 = bl.by_priority.find((x) => x.priority === "P1")?.open ?? 0;
  const pct = ck.working_days > 0 ? Math.min(1, ck.days_complete / ck.working_days) : null;
  const todayCheck = d.heat[today];
  const lastWeek = d.trend.at(-2)?.total ?? 0;
  const diff = s.week.received - lastWeek;
  const trendTotal = d.trend.reduce((a, w) => a + w.total, 0);
  const trendInc = d.trend.reduce((a, w) => a + w.incidents, 0);
  const heatDays = Object.values(d.heat);

  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-3 py-4 sm:gap-5 sm:px-5 sm:py-5 lg:px-7 lg:py-6">
      {/* hero */}
      <section className="hero p-5 sm:p-7 lg:px-8">
        <span className="hring" style={{ width: 360, height: 360, right: -120, top: -170 }} />
        <span className="hring" style={{ width: 240, height: 240, right: -60, top: -110 }} />
        <span className="hring" style={{ width: 520, height: 520, right: -220, top: -250, opacity: 0.6 }} />
        <div className="relative flex flex-wrap items-end gap-5">
          <div className="min-w-0 flex-1">
            <div className="date"><CalendarDays className="size-4" />{longThaiDate(today)}</div>
            <div className="ttl text-[26px] sm:text-[32px]">ภาพรวมงาน IT</div>
            <div className="wk">สัปดาห์ที่ {isoWeek(today)} · {shortThaiDate(d.period.week_start)} – {shortThaiDate(d.period.week_end)}</div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="stat"><i style={{ background: todayCheck?.c === 1 && !todayCheck.ng ? "#7FD8A4" : "#F5C451" }} />
                Daily Check วันนี้ {todayCheck ? (todayCheck.c === 1 ? "ครบ" : "ไม่ครบ") : "ยังไม่ได้เช็ค"}{todayCheck?.ng ? ` · NG ${todayCheck.ng}` : ""}</span>
              <span className="stat"><i style={{ background: p1 ? "#FF8A8A" : "#7FD8A4" }} />P1 เปิดอยู่ {p1}</span>
            </div>
          </div>
          <div className="acts w-full sm:w-auto">
            <Link className="btn btn-white btn-lg flex-1 sm:flex-none" href="/daily"><ClipboardCheck className="size-5" />เช็ครายวัน</Link>
            <Link className="btn btn-glass btn-lg flex-1 sm:flex-none" href="/service/new"><Plus className="size-5" />แจ้งปัญหา</Link>
          </div>
        </div>
      </section>

      <section className="kgrid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6" aria-label="ตัวชี้วัด">
        <Kpi icon={Inbox} chip={bl.total ? "warn" : "ok"} tag={bl.total ? "warn" : "ok"} num={bl.total} label="งานค้าง" href="/service"
          sub={bl.by_priority.filter((p) => p.open).map((p) => `${p.priority} ${p.open}`).join(" · ") || "ไม่มีงานค้าง"} />
        <Kpi icon={Siren} chip={p1 ? "bad" : "ok"} tag={p1 ? "bad" : "ok"} num={p1} label="P1 เปิดอยู่" href="/service" sub={p1 ? "ต้องแก้ทันที" : "ไม่มีงานเร่งด่วน"} />
        <Kpi icon={Wrench} tag="ok" num={s.week.received} label="คำขอสัปดาห์นี้"
          sub={diff === 0 ? "เท่ากับสัปดาห์ก่อน" : `${diff > 0 ? "+" : ""}${diff} จากสัปดาห์ก่อน`} />
        <Kpi icon={TriangleAlert} chip="orange" tag={s.month.incidents ? "warn" : "ok"} num={s.month.incidents} label="Incident เดือนนี้"
          sub={`สัปดาห์นี้ ${s.week.incidents} · ส่งต่อ ${s.month.escalated}`} />
        <Kpi icon={Clock3} chip="violet" tag={s.month.avg_hours != null && s.month.avg_hours > 4 ? "warn" : "ok"} num={s.month.avg_hours ?? "–"}
          unit={s.month.avg_hours != null ? "ชม." : undefined} label="เวลาแก้เฉลี่ย" sub="เป้าหมาย ≤ 4 ชม." />
        <Kpi icon={AlarmClock} chip={pct != null && pct < 1 ? "warn" : "ok"} tag={pct != null && pct < 1 ? "warn" : "ok"} href="/daily"
          num={pct == null ? "–" : Math.round(pct * 100)} unit={pct == null ? undefined : "%"} label="Daily Check ครบ"
          sub={`เดือนนี้ ${ck.days_complete}/${ck.working_days} วัน${ck.working_days - ck.days_complete > 0 ? ` · ขาด ${ck.working_days - ck.days_complete}` : ""}`} />
      </section>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section className="card">
          <div className="card-h">
            <h2 className="h2">คำขอรายสัปดาห์</h2>
            <div className="legend">
              <span><i style={{ background: "var(--barA)" }} />คำขอทั่วไป</span>
              <span><i style={{ background: "var(--barB)" }} />Incident</span>
            </div>
          </div>
          <div className="muted small" style={{ margin: "-8px 0 14px" }}>8 สัปดาห์ล่าสุด · รวม {trendTotal} งาน · Incident {trendInc}</div>
          <Bars weeks={d.trend} />
        </section>

        <section className="card">
          <div className="card-h">
            <h2 className="h2">Daily Check</h2>
            <Link className="link" href="/daily">เปิด<ChevronRight className="size-4" /></Link>
          </div>
          <div className="muted small" style={{ margin: "-8px 0 14px" }}>
            16 สัปดาห์ล่าสุด · ครบ {heatDays.filter((h) => h.c === 1 && !h.ng).length} วัน · พบ NG {heatDays.filter((h) => h.ng).length} วัน
          </div>
          <Heat heat={d.heat} weekStart={d.period.week_start} today={today} />
          <div className="hmleg">
            <span><i style={{ background: "var(--ok)" }} />ครบ</span>
            <span><i style={{ background: "var(--warn)" }} />ไม่ครบ</span>
            <span><i style={{ background: "var(--bad)" }}>!</i>พบ NG</span>
            <span><i style={{ boxShadow: "inset 0 0 0 1.5px var(--fieldLine)" }} />ไม่ได้เช็ค</span>
            <span><i style={{ background: "var(--empty)" }} />วันหยุด</span>
          </div>
          <p className="small muted mt-3">
            Weekly check สัปดาห์นี้: {ck.weekly_done ? "ทำแล้ว" : "ยังไม่ทำ"} · Backup ล่าสุด: {ck.latest_backup ?? "–"}
            {ck.lowest_disk != null && ` · ดิสก์ว่างต่ำสุด ${ck.lowest_disk}%`}
          </p>
        </section>
      </div>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        <section className="card">
          <div className="card-h">
            <h2 className="h2">งานค้าง <span className="muted small font-normal">เก่าสุดก่อน</span></h2>
            <Link className="link" href="/service">ทั้งหมด<ChevronRight className="size-4" /></Link>
          </div>
          {d.open.length === 0 ? <p className="muted">ไม่มีงานค้าง</p> : (
            <div>
              {d.open.map((r) => (
                <Link key={r.id} href={`/service/${r.id}`} className="li">
                  <span className={`prio ${r.priority.toLowerCase()}`}>{r.priority}</span>
                  <div className="min-w-0 flex-1">
                    <div className="t truncate"><span className="mono">{r.req_no}</span> · {r.requester}</div>
                    <div className="m"><span className="truncate">{r.detail ?? r.system ?? "-"}</span></div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`pill sm ${SERVICE_TONE[r.status] ?? "t-grey"}`}>{r.status}</span>
                    <span className="days">{daysBetween(r.req_date, today)} วัน</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-h"><h2 className="h2">สถานะ Maintenance</h2></div>
          <div className="overflow-x-auto">
            <table className="tbl plain">
              <thead><tr><th>ประเภท</th><th>ผ่านล่าสุด</th><th>ครบกำหนด</th><th>สถานะ</th></tr></thead>
              <tbody>
                {mt.types.map((m) => (
                  <tr key={m.type}>
                    <td className="!whitespace-normal"><div className="font-semibold">{m.type}</div><div className="muted small">ทุก {m.every_months} เดือน</div></td>
                    <td>{thDate(m.last_pass) || "–"}</td>
                    <td>{thDate(m.next_due) || "–"}</td>
                    <td><span className={`pill sm ${MAINT_TONE[m.status] ?? "t-grey"}`}>{m.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small muted mt-3">รอเซ็นรับรองรายไตรมาส {mt.pending_signoff} · ทดสอบไม่ผ่านเดือนนี้ {mt.failed_month}</p>
        </section>
      </div>

      <section className="card">
        <div className="card-h">
          <h2 className="h2">ทรัพย์สิน IT <span className="muted small font-normal">รวม {ah.total}</span></h2>
          <Link className="link" href="/assets">ดูทั้งหมด<ChevronRight className="size-4" /></Link>
        </div>
        <div className="stack-bar mb-3" role="img" aria-label="สัดส่วนสถานะทรัพย์สิน">
          {ASSET_STATUSES.filter((x) => ah.byStatus[x.v]).map((x) => (
            <i key={x.v} style={{ flex: ah.byStatus[x.v], background: `var(--${STATUS_TONE[x.v].slice(2)}-fg)` }} title={`${x.th} ${ah.byStatus[x.v]}`} />
          ))}
        </div>
        <div className="mb-5 flex flex-wrap gap-2">
          {ASSET_STATUSES.filter((x) => ah.byStatus[x.v]).map((x) => (
            <Link key={x.v} href={`/assets?status=${encodeURIComponent(x.v)}`} className={`pill lg ${STATUS_TONE[x.v]}`}>{x.th} <b>{ah.byStatus[x.v]}</b></Link>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="st">
            <span className="small font-semibold ink2">ประกันหมด / ใกล้หมด (≤ {WARRANTY_DAYS} วัน)</span>
            <b>{ah.warranty.length}</b>
            {ah.warranty.length === 0
              ? <span className="small muted">กรอกวันหมดประกันในหน้าทรัพย์สินเพื่อให้ระบบเตือน</span>
              : ah.warranty.slice(0, 4).map((w) => (
                <Link key={w.id} href={`/assets/${w.id}`} className="small flex gap-2 hover:underline">
                  <span className="mono font-semibold">{w.asset_tag}</span>
                  <span className={w.days < 0 ? "font-semibold text-[var(--bad-fg)]" : "text-[var(--warn-fg)]"}>{w.days < 0 ? `หมดแล้ว ${-w.days} วัน` : `อีก ${w.days} วัน`}</span>
                </Link>
              ))}
          </div>
          <Link href="/assets?missing=serial" className="st hover:border-[var(--fieldLine)]">
            <span className="small font-semibold ink2">ยังไม่มี Serial No.</span>
            <b>{ah.missingSerial.length}</b>
            <span className="small muted">จากเครื่องที่ใช้งาน/สต็อก/ซ่อม · แตะเพื่อเติม</span>
          </Link>
          <div className="st">
            <span className="small font-semibold ink2">แจ้งปัญหาบ่อย (12 เดือน)</span>
            {ah.topRepairs.length === 0 ? <span className="small muted">ยังไม่มีคำขอที่ผูกกับเครื่อง</span> : ah.topRepairs.map((r) => (
              <Link key={r.id} href={`/assets/${r.id}`} className="small flex gap-2 hover:underline">
                <span className="mono font-semibold">{r.asset_tag}</span><span className="min-w-0 flex-1 truncate muted">{r.user_name ?? r.label}</span><b className="text-sm">{r.count}</b>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-h"><h2 className="h2">คำขอตามประเภท</h2></div>
        <div className="overflow-x-auto">
          <table className="tbl plain max-w-md">
            <thead><tr><th>ประเภท</th><th className="!text-right">สัปดาห์นี้</th><th className="!text-right">เดือนนี้</th></tr></thead>
            <tbody>
              {d.by_type.map((t) => (
                <tr key={t.type}><td>{t.type}</td><td className="text-right tabular-nums">{t.week}</td><td className="text-right tabular-nums">{t.month}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
