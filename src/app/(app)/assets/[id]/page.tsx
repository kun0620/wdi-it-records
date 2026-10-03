import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftRight, History, Pencil, Plus, QrCode, RefreshCw } from "lucide-react";
import { getSession } from "@/lib/supabase/server";
import { getLists, getPositions } from "@/lib/lists";
import { shortThaiDate, thDate, todayISO } from "@/lib/dates";
import AssetForm from "../AssetForm";
import { prefixOf, STATUS_TONE, statusOf, type AssetRow } from "../shared";
import { retagAsset } from "../actions";
import AssetIcon from "../AssetIcon";
import { SERVICE_TONE } from "../../service/shared";

type Audit = { id: number; at: string; actor: string | null; op: string; changed: Record<string, [unknown, unknown]> | null };

const HIDDEN = new Set(["updated_at", "updated_by", "created_at", "created_by", "raw", "imported_at"]);
const LABEL: Record<string, string> = {
  asset_tag: "แท็ก", status: "สถานะ", category: "ประเภท", name: "ชื่อเครื่อง", manufacturer: "ยี่ห้อ", model: "รุ่น", serial: "S/N",
  user_name: "ผู้ใช้", position: "ตำแหน่ง", department: "แผนก", location: "ที่ตั้ง", ip_address: "IP", mac: "MAC",
  purchase_date: "วันที่ซื้อ", warranty_end: "หมดประกัน", vendor: "ผู้ขาย", price: "ราคา", remark: "หมายเหตุ",
};
const fmt = (v: unknown) => (v === null || v === undefined || v === "" ? "ว่าง" : String(v));
const initials = (name: string) => name.replace(/^(Mr\.|Ms\.|Mrs\.|Miss)\s*/i, "").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
const when = (at: string) => new Date(at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function AssetPage(props: PageProps<"/assets/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  if (!/^\d+$/.test(id)) notFound();

  const { supabase, role } = await getSession();
  const [{ data }, { data: history }, lists, { data: handovers }, positions, { data: services }] = await Promise.all([
    supabase.from("assets").select("*").eq("id", Number(id)).maybeSingle(),
    supabase.from("audit_log").select("id, at, actor, op, changed")
      .eq("table_name", "assets").eq("row_id", Number(id)).order("id", { ascending: false }).limit(50),
    getLists(supabase, ["user", "dept"]),
    supabase.from("handover").select("id, h_date, action, user_name, position, dept, condition, form_ref, remark")
      .eq("asset_id", Number(id)).order("h_date", { ascending: false }).order("id", { ascending: false }),
    getPositions(supabase),
    supabase.from("service_log").select("id, req_no, req_date, type, priority, status, detail, hours")
      .eq("asset_id", Number(id)).order("req_date", { ascending: false }).order("id", { ascending: false }),
  ]);
  if (!data) notFound();
  const rec = data as AssetRow;
  const st = statusOf(rec.status);
  const lastIssue = (handovers ?? []).find((h) => h.action === "Issue");
  const canHandover = role === "editor" && ["In Use", "In Stock", "Repair"].includes(rec.status) && rec.asset_tag;
  const audits = ((history as Audit[] | null) ?? [])
    .map((h) => ({ ...h, changes: Object.entries(h.changed ?? {}).filter(([k]) => !HIDDEN.has(k)) }))
    .filter((h) => h.op === "INSERT" || h.changes.length > 0);

  return (
    <main className="mx-auto grid w-full max-w-[1400px] gap-3 px-3 py-3 sm:gap-4 sm:px-5 sm:py-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-7">
      <div className="flex min-w-0 flex-col gap-3 sm:gap-4">
        {/* header */}
        <section className="card !p-4">
          <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
            <AssetIcon tag={rec.asset_tag} category={rec.category} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: "var(--accentInk)", lineHeight: 1.3 }}>{rec.asset_tag ?? "ยังไม่มีแท็ก"}</div>
              <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.35, margin: "2px 0 8px" }}>
                {[rec.manufacturer, rec.model].filter(Boolean).join(" ") || rec.name || rec.category}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`pill lg ${STATUS_TONE[rec.status] ?? "t-grey"}`}>{st?.th ?? rec.status}</span>
                {rec.source_sheet && <span className="small muted">นำเข้าจากชีต {rec.source_sheet}</span>}
              </div>
            </div>
          </div>
          <div className="mt-3.5 grid grid-cols-2 gap-2">
            {rec.asset_tag
              ? <Link href={`/assets/labels?ids=${rec.id}`} className="btn btn-secondary btn-block"><QrCode className="size-4" />พิมพ์ป้าย QR</Link>
              : <span />}
            <a href="#history" className="btn btn-secondary btn-block"><History className="size-4" />ประวัติ</a>
          </div>
        </section>

        {rec.asset_tag && !rec.asset_tag.startsWith(`WDI-${prefixOf(rec.category)}-`) && (
          <form action={retagAsset} className="banner warn flex-wrap">
            <input type="hidden" name="id" value={rec.id} />
            <span className="small">แท็ก {rec.asset_tag} ไม่ตรงกับประเภท “{rec.category}” (ควรขึ้นต้น WDI-{prefixOf(rec.category)}-)</span>
            {role === "editor" && <button className="btn btn-primary btn-sm"><RefreshCw className="size-4" />ออกแท็กใหม่ตามประเภท</button>}
          </form>
        )}
        {sp.handover && <p className="banner info small">บันทึก{sp.handover === "Issue" ? "ส่งมอบ" : "รับคืน"}แล้ว — สถานะและผู้ใช้อัปเดตให้อัตโนมัติ</p>}
        {sp.saved && <p className="banner info small">บันทึกแล้ว</p>}

        <div className="lg:hidden"><Holder /></div>

        <AssetForm key={rec.updated_at} rec={rec} users={lists.user.map((u) => u.value)} depts={lists.dept.map((d) => d.value)} positions={positions}
          canEdit={role === "editor"} today={todayISO()} lastEdit={audits[0] ? shortThaiDate(audits[0].at.slice(0, 10)) : undefined} />
      </div>

      <aside className="flex min-w-0 flex-col gap-3 sm:gap-4">
        <div className="hidden lg:block"><Holder /></div>

        <section className="card !p-4">
          <div className="card-h">
            <h2 className="h3">แจ้งปัญหา / ซ่อม <span className="muted small font-normal">{services?.length ?? 0} ครั้ง</span></h2>
            {role === "editor" && <Link href={`/service/new?asset=${rec.id}`} className="link"><Plus className="size-4" />แจ้งปัญหา</Link>}
          </div>
          {!services?.length ? <p className="small muted">ยังไม่เคยแจ้งปัญหา</p> : services.map((s) => (
            <Link key={s.id} href={`/service/${s.id}`} className="li">
              <span className={`prio ${s.priority.toLowerCase()}`}>{s.priority}</span>
              <div className="min-w-0 flex-1">
                <div className="t"><span className="mono">{s.req_no}</span></div>
                <div className="m"><span className="truncate">{s.detail ?? s.type}</span></div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`pill sm ${SERVICE_TONE[s.status] ?? "t-grey"}`}>{s.status}</span>
                <span className="days">{shortThaiDate(s.req_date)}{s.hours != null ? ` · ${s.hours} ชม.` : ""}</span>
              </div>
            </Link>
          ))}
        </section>

        <section className="card !p-4" id="history">
          <div className="card-h"><h2 className="h3">ประวัติการเปลี่ยนแปลง</h2></div>
          {audits.length === 0 ? <p className="small muted">ยังไม่มีประวัติ</p> : (
            <div className="timeline">
              {audits.map((h) => (
                <div key={h.id} className="tl">
                  <span className="nd">{h.op === "INSERT" ? <Plus className="size-3.5" /> : <Pencil className="size-3.5" />}</span>
                  <div className="min-w-0 flex-1">
                    <div className="small muted">{when(h.at)} · {h.actor || "ระบบ"}</div>
                    {h.op === "INSERT" && h.changes.length === 0 && <div className="small">เพิ่มรายการ</div>}
                    {h.changes.map(([k, [a, b]]) => (
                      <div key={k} className="diff mt-0.5">
                        <span className="small ink2">{LABEL[k] ?? k}</span>
                        <span className="old">{fmt(a)}</span><span aria-hidden>→</span><span className="new">{fmt(b)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </aside>
    </main>
  );

  // current holder + handover history (shown above the form on phones, in the side column on desktop)
  function Holder() {
    return (
      <section className="card !p-4">
        <div className="micro" style={{ marginBottom: 12 }}>{rec.status === "In Use" ? "ตอนนี้อยู่กับ" : "การรับ-คืน"}</div>
        {rec.status === "In Use" && rec.user_name ? (
          <>
            <div className="row" style={{ gap: 12 }}>
              <span className="avatar lg">{initials(rec.user_name)}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate" style={{ fontWeight: 700, fontSize: 16 }}>{rec.user_name}</div>
                <div className="small ink2">{[rec.position, rec.department && `(${rec.department})`].filter(Boolean).join(" ") || "—"}</div>
              </div>
            </div>
            {lastIssue && (
              <div className="small muted row" style={{ gap: 6, margin: "12px 0 0" }}>
                <ArrowLeftRight className="size-3.5" />ตั้งแต่ {shortThaiDate(lastIssue.h_date)}
                {lastIssue.form_ref && <> · ใบส่งมอบ <span className="mono">{lastIssue.form_ref}</span></>}
              </div>
            )}
          </>
        ) : <p className="small muted">ตอนนี้ไม่ได้ส่งมอบให้ใคร ({st?.th ?? rec.status})</p>}
        {canHandover && (
          <Link href={`/handover/new?asset=${rec.id}`} className="btn btn-secondary btn-block mt-3.5" style={{ height: 44 }}>
            <ArrowLeftRight className="size-4" />{rec.status === "In Use" ? "รับคืน" : "ส่งมอบ"}
          </Link>
        )}
        {(handovers ?? []).length > 0 && (
          <div className="mt-3 border-t border-[var(--line2)] pt-2">
            {(handovers ?? []).map((h) => (
              <div key={h.id} className="small flex flex-wrap gap-x-2 py-1">
                <span className="muted">{thDate(h.h_date)}</span>
                <b>{h.action === "Issue" ? "ส่งมอบให้" : "รับคืนจาก"}</b>{h.user_name}
                <span className="muted">{[h.condition, h.form_ref && `ใบ ${h.form_ref}`].filter(Boolean).join(" · ")}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }
}
