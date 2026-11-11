import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import {
  AlarmClock, BatteryCharging, CalendarRange, Cctv, ChevronRight, CircleCheck, ClipboardCheck, Clock3, Globe, Inbox, Network,
  Plus, Server, ShieldCheck, ShieldAlert, Siren, TriangleAlert, Wifi, Wrench, type LucideIcon,
} from "lucide-react";
import { getSession } from "@/lib/supabase/server";
import { daysBetween, longThaiDate, shortThaiDate, thaiMonth, thDate, todayISO } from "@/lib/dates";
import { assetHealth, WARRANTY_DAYS } from "@/lib/asset-health";
import { ASSET_STATUSES } from "./assets/shared";
import { CHECKS, type CheckKey, type CheckResult } from "./daily/checks";

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
const MAINT_TONE: Record<string, string> = { OK: "t-ok", "DUE SOON": "t-warn", OVERDUE: "t-bad", "NOT DONE": "t-bad" };
const MAINT_TH: Record<string, string> = { OK: "ผ่าน", "DUE SOON": "ใกล้ครบ", OVERDUE: "เลยกำหนด", "NOT DONE": "ยังไม่ทำ" };
const STATUS_TONE: Record<string, string> = { "In Use": "t-ok", "In Stock": "t-info", Repair: "t-warn", Waiting: "t-orange", Retired: "t-grey", Lost: "t-bad", Planned: "t-violet" };
const TAG = { warn: ["t-warn", "ต้องดู"], bad: ["t-bad", "เร่งด่วน"] } as const;

// Icons for the 7 plant systems of the daily check (names come from CHECKS, shared with the Daily page).
const SYSTEM_ICON: Record<CheckKey, LucideIcon> = {
  firewall: ShieldCheck, wan: Globe, vpn: Network, core_switch: Server, wifi: Wifi, cctv: Cctv, ups: BatteryCharging,
};

// A KPI stays quiet when its value is normal; only an off-target value gets a tag.
function Kpi({ icon: Icon, tag, num, unit, label, sub, href }: {
  icon: LucideIcon; tag?: keyof typeof TAG; num: string | number; unit?: string; label: string; sub: string; href?: string;
}) {
  const body = (
    <>
      <div className="top">
        <span className={`kchip sm ${tag ?? "quiet"}`}><Icon className="size-4" strokeWidth={2} /></span>
        {tag && <span className={`pill sm ${TAG[tag][0]}`}>{TAG[tag][1]}</span>}
      </div>
      <div className="num">{num}{unit && <small>{unit}</small>}</div>
      <div className="lbl">{label}</div>
      <div className="sub">{sub}</div>
    </>
  );
  return href ? <Link href={href} className="kpi transition-shadow hover:shadow-[var(--shadow2)]">{body}</Link> : <div className="kpi">{body}</div>;
}

type Todo = { key: string; tone: "bad" | "warn" | "info"; icon: LucideIcon; title: ReactNode; meta: string; href: string; prio?: string };

function TodoRow({ t }: { t: Todo }) {
  const Icon = t.icon;
  return (
    <Link href={t.href} className={`todo ${t.tone}`}>
      {t.prio ? <span className={`prio ${t.prio.toLowerCase()}`}>{t.prio}</span> : <span className="ti"><Icon className="size-[18px]" strokeWidth={2} /></span>}
      <span className="min-w-0 flex-1">
        <span className="tt">{t.title}</span>
        <span className="tm">{t.meta}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-[var(--ink3)]" />
    </Link>
  );
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
          // phone: label every other week (counting back from the current one) so dates do not collide
          <span key={w.week_start} className={`min-w-0 ${i === weeks.length - 1 ? "cur" : ""} ${(weeks.length - 1 - i) % 2 ? "max-sm:invisible" : ""}`}>
            <span className="hidden sm:inline">{shortThaiDate(w.week_start)}</span>
            <span className="sm:hidden">{Number(w.week_start.slice(8))}/{Number(w.week_start.slice(5, 7))}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// Daily Check, 16 weeks x Mon..Sun, month labels on top, day labels on the left.
// Days before the first ever daily check are shown as "not started", not as missed checks.
function Heat({ heat, weekStart, today, since }: { heat: Dash["heat"]; weekStart: string; today: string; since: string | null }) {
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
    if (!since || iso < since) return "pre";
    return d === 6 ? "" : "none";            // Sunday = no work, otherwise a missed check
  };
  return (
    <div className="hm" role="img" aria-label="Daily Check 16 สัปดาห์" style={{ gridTemplateColumns: "22px repeat(16, minmax(0, 1fr))", gap: 4, maxWidth: 560 }}>
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
  const [{ data, error }, ah, { data: dc }, { data: first }] = await Promise.all([
    supabase.rpc("dashboard", { report_date: today }),
    assetHealth(supabase, today),
    supabase.from("daily_check").select(CHECKS.map((c) => c.k).join(",")).eq("check_date", today).maybeSingle(),
    supabase.from("daily_check").select("check_date").order("check_date").limit(1).maybeSingle(),
  ]);
  if (error || !data) return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="card flex flex-wrap items-center gap-3">
        <TriangleAlert className="size-5 text-[var(--bad-fg)]" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold">โหลดภาพรวมไม่ได้</div>
          <div className="small muted">ตรวจการเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่ ({error?.message ?? "ไม่มีข้อมูล"})</div>
        </div>
        <Link className="btn btn-secondary" href="/">ลองใหม่</Link>
      </div>
    </main>
  );
  const d = data as Dash;
  const daily = dc as Record<CheckKey, CheckResult | null> | null;
  const { service: s, backlog: bl, checks: ck, maintenance: mt } = d;
  const p1 = bl.by_priority.find((x) => x.priority === "P1")?.open ?? 0;
  const pct = ck.working_days > 0 ? Math.min(1, ck.days_complete / ck.working_days) : null;
  const lastWeek = d.trend.at(-2)?.total ?? 0;
  const diff = s.week.received - lastWeek;
  const trendTotal = d.trend.reduce((a, w) => a + w.total, 0);
  const trendInc = d.trend.reduce((a, w) => a + w.incidents, 0);
  const heatDays = Object.values(d.heat);
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay();     // 0 = Sunday (no daily check)

  const done = daily ? CHECKS.filter((c) => daily[c.k]).length : 0;
  const ngs = daily ? CHECKS.filter((c) => daily[c.k] === "NG") : [];

  // What needs the officer today, most urgent first.
  const todo: Todo[] = [];
  if (ngs.length) todo.push({ key: "ng", tone: "bad", icon: ShieldAlert, href: "/daily",
    title: `พบ NG: ${ngs.map((c) => c.name).join(", ")}`, meta: "จากเช็ครายวันวันนี้ · เปิดงาน Incident ได้ในหน้าเช็ครายวัน" });
  if (dow !== 0 && !daily) todo.push({ key: "daily", tone: "warn", icon: ClipboardCheck, href: "/daily", title: "ยังไม่ได้ทำเช็ครายวัน", meta: "7 ระบบ · Firewall ถึง UPS" });
  else if (daily && done < 7) todo.push({ key: "daily", tone: "warn", icon: ClipboardCheck, href: "/daily", title: `เช็ครายวันยังไม่ครบ ${done}/7`, meta: "บันทึกให้ครบทุกระบบ" });
  for (const r of d.open.filter((r) => r.priority === "P1" || r.priority === "P2")) {
    todo.push({ key: `sr${r.id}`, tone: r.priority === "P1" ? "bad" : "warn", icon: Siren, prio: r.priority, href: `/service/${r.id}`,
      title: <><span className="mono">{r.req_no}</span> · {r.detail ?? r.system ?? r.requester}</>,
      meta: `${r.requester} · ค้าง ${daysBetween(r.req_date, today)} วัน` });
  }
  for (const m of mt.types.filter((m) => m.status !== "OK")) {
    todo.push({ key: `mt${m.type}`, tone: m.status === "DUE SOON" ? "warn" : "bad", icon: Wrench, href: "/maintenance",
      title: `${m.type}: ${MAINT_TH[m.status] ?? m.status}`, meta: m.next_due ? `ครบกำหนด ${thDate(m.next_due)}` : `ทุก ${m.every_months} เดือน · ยังไม่มีรอบที่ผ่าน` });
  }
  const rest = d.open.filter((r) => r.priority !== "P1" && r.priority !== "P2").length;
  if (rest) todo.push({ key: "rest", tone: "info", icon: Inbox, href: "/service", title: `งานค้าง P3–P4 อีก ${rest} รายการ`, meta: "เก่าสุดก่อนในหน้าคำขอ/ปัญหา" });
  if (ah.warranty.length) todo.push({ key: "wty", tone: ah.warranty[0].days < 0 ? "bad" : "warn", icon: ShieldAlert,
    href: ah.warranty.length === 1 ? `/assets/${ah.warranty[0].id}` : "/assets",
    title: `ประกันหมด/ใกล้หมด ${ah.warranty.length} เครื่อง`, meta: ah.warranty.slice(0, 3).map((w) => w.asset_tag).join(", ") });
  if (!ck.weekly_done && dow >= 4) todo.push({ key: "wk", tone: "info", icon: CalendarRange, href: "/weekly", title: "Weekly check สัปดาห์นี้ยังไม่ทำ", meta: "ก่อนส่งรายงานวันศุกร์" });
  if (mt.pending_signoff) todo.push({ key: "sign", tone: "info", icon: Wrench, href: "/maintenance", title: `รอเซ็นรับรองรายไตรมาส ${mt.pending_signoff} รายการ`, meta: "บำรุงรักษา" });
  const order = { bad: 0, warn: 1, info: 2 };
  todo.sort((a, b) => order[a.tone] - order[b.tone]);

  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-3 py-4 sm:gap-5 sm:px-5 sm:py-5 lg:px-7 lg:py-6">
      {/* plant status: the 7 daily-check systems for today */}
      <section className="card plant" aria-labelledby="plant-h">
        <div className="plant-h">
          <div className="min-w-0 flex-1">
            <h2 id="plant-h" className="h2">ระบบวันนี้</h2>
            <p className="small muted">
              {longThaiDate(today)} · {dow === 0 ? "วันอาทิตย์ ไม่มีเช็ครายวัน" : !daily ? "ยังไม่ได้เช็ค" : `เช็คแล้ว ${done}/7${ngs.length ? ` · NG ${ngs.length}` : " · ไม่พบ NG"}`}
            </p>
          </div>
          <div className="plant-acts">
            <Link className="btn btn-primary" href="/daily"><ClipboardCheck className="size-5" />เช็ครายวัน</Link>
            <Link className="btn btn-secondary" href="/service/new"><Plus className="size-5" />แจ้งปัญหา</Link>
          </div>
        </div>
        <ul className="sys" aria-label="สถานะ 7 ระบบ">
          {CHECKS.map((c) => {
            const r = daily?.[c.k] ?? null;
            const Icon = SYSTEM_ICON[c.k];
            const state = r === "OK" ? "ok" : r === "NG" ? "ng" : r === "N/A" ? "na" : "none";
            return (
              <li key={c.k} className={`sy ${state}`} title={c.th}>
                <Icon className="size-[18px]" strokeWidth={2} aria-hidden />
                <span className="sn">{c.name}</span>
                <span className="sv">{r ?? "ยังไม่เช็ค"}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="card" aria-labelledby="todo-h">
          <div className="card-h">
            <h2 id="todo-h" className="h2">ต้องทำวันนี้ {todo.length > 0 && <span className={`count ml-1 align-middle ${todo.some((t) => t.tone === "bad") ? "" : "quiet"}`}>{todo.length}</span>}</h2>
            <Link className="link" href="/service">คำขอทั้งหมด<ChevronRight className="size-4" /></Link>
          </div>
          {todo.length === 0 ? (
            <div className="todo-clear"><CircleCheck className="size-5" />ไม่มีอะไรค้าง ทุกระบบปกติ</div>
          ) : (
            <div className="todos">{todo.map((t) => <TodoRow key={t.key} t={t} />)}</div>
          )}
        </section>

        <section className="kgrid grid-cols-2 content-start" aria-label="ตัวชี้วัด">
          <Kpi icon={Inbox} tag={p1 ? "bad" : bl.total ? "warn" : undefined} num={bl.total} label="งานค้าง" href="/service"
            sub={bl.by_priority.filter((p) => p.open).map((p) => `${p.priority} ${p.open}`).join(" · ") || "ไม่มีงานค้าง"} />
          <Kpi icon={Wrench} num={s.week.received} label="คำขอสัปดาห์นี้"
            sub={diff === 0 ? "เท่ากับสัปดาห์ก่อน" : `${diff > 0 ? "+" : ""}${diff} จากสัปดาห์ก่อน · Incident ${s.week.incidents}`} />
          <Kpi icon={Clock3} tag={s.month.avg_hours != null && s.month.avg_hours > 4 ? "warn" : undefined} num={s.month.avg_hours ?? "–"}
            unit={s.month.avg_hours != null ? "ชม." : undefined} label="เวลาแก้เฉลี่ย"
            sub={s.month.avg_hours == null ? "ยังไม่มีงานปิดเดือนนี้" : "เดือนนี้ · เป้าหมาย ≤ 4 ชม."} />
          <Kpi icon={AlarmClock} tag={pct != null && pct < 1 ? "warn" : undefined} href="/daily"
            num={pct == null ? "–" : Math.round(pct * 100)} unit={pct == null ? undefined : "%"} label="เช็ครายวันครบ"
            sub={`เดือนนี้ ${ck.days_complete}/${ck.working_days} วัน${ck.working_days - ck.days_complete > 0 ? ` · ขาด ${ck.working_days - ck.days_complete}` : ""}`} />
        </section>
      </div>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section className="card">
          <div className="card-h">
            <h2 className="h2">คำขอรายสัปดาห์</h2>
            <div className="legend">
              <span><i style={{ background: "var(--barA)" }} />คำขอทั่วไป</span>
              <span><i style={{ background: "var(--barB)" }} />Incident</span>
            </div>
          </div>
          <div className="muted small" style={{ margin: "-8px 0 14px" }}>8 สัปดาห์ล่าสุด · รวม {trendTotal} งาน · Incident {trendInc} · เดือนนี้ส่งต่อ {s.month.escalated}</div>
          <Bars weeks={d.trend} />
        </section>

        <section className="card">
          <div className="card-h">
            <h2 className="h2">เช็ครายวัน 16 สัปดาห์</h2>
            <Link className="link" href="/daily">เปิด<ChevronRight className="size-4" /></Link>
          </div>
          <div className="muted small" style={{ margin: "-8px 0 14px" }}>
            ครบ {heatDays.filter((h) => h.c === 1 && !h.ng).length} วัน · พบ NG {heatDays.filter((h) => h.ng).length} วัน
          </div>
          <Heat heat={d.heat} weekStart={d.period.week_start} today={today} since={(first as { check_date: string } | null)?.check_date ?? null} />
          <div className="hmleg">
            <span><i style={{ background: "var(--ok)" }} />ครบ</span>
            <span><i style={{ background: "var(--warn)" }} />ไม่ครบ</span>
            <span><i style={{ background: "var(--bad)" }}>!</i>พบ NG</span>
            <span><i style={{ boxShadow: "inset 0 0 0 1.5px var(--fieldLine)" }} />ไม่ได้เช็ค</span>
            <span><i style={{ background: "var(--empty)" }} />วันหยุด</span>
            <span><i style={{ boxShadow: "inset 0 0 0 1px var(--line2)" }} />ก่อนเริ่มใช้แอป</span>
          </div>
          <p className="small muted mt-3">
            <Link href="/weekly" className="link !text-[12.5px]">Weekly check สัปดาห์นี้: {ck.weekly_done ? "ทำแล้ว" : "ยังไม่ทำ"}</Link> · Backup ล่าสุด: {ck.latest_backup ?? "–"}
            {ck.lowest_disk != null && ` · ดิสก์ว่างต่ำสุด ${ck.lowest_disk}%`}
          </p>
        </section>
      </div>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        <section className="card">
          <div className="card-h">
            <h2 className="h2">บำรุงรักษา</h2>
            <Link className="link" href="/maintenance">เปิด<ChevronRight className="size-4" /></Link>
          </div>
          <ul className="mrows">
            {mt.types.map((m) => (
              <li key={m.type}>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{m.type}</div>
                  <div className="small muted">ทุก {m.every_months} เดือน · ผ่านล่าสุด {thDate(m.last_pass) || "–"} · ครบกำหนด {thDate(m.next_due) || "–"}</div>
                </div>
                <span className={`pill sm ${MAINT_TONE[m.status] ?? "t-grey"}`}>{MAINT_TH[m.status] ?? m.status}</span>
              </li>
            ))}
          </ul>
          <p className="small muted mt-3">รอเซ็นรับรองรายไตรมาส {mt.pending_signoff} · ทดสอบไม่ผ่านเดือนนี้ {mt.failed_month}</p>
        </section>

        <section className="card">
          <div className="card-h"><h2 className="h2">คำขอตามประเภท</h2></div>
          <div className="overflow-x-auto">
            <table className="tbl plain">
              <thead><tr><th>ประเภท</th><th className="!text-right">สัปดาห์นี้</th><th className="!text-right">เดือนนี้</th></tr></thead>
              <tbody>
                {d.by_type.map((t) => (
                  <tr key={t.type} className={t.month ? "" : "zero"}><td>{t.type}</td><td className="text-right tabular-nums">{t.week}</td><td className="text-right tabular-nums">{t.month}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
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
    </main>
  );
}
