"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays, Cctv, Check, CheckCheck, ChevronRight, Globe, Network, Shield, TriangleAlert, Wifi, Zap, type LucideIcon,
} from "lucide-react";
import { longThaiDate, thDate } from "@/lib/dates";
import { CHECKS, RESULTS, type CheckKey, type CheckResult, type DailyRow } from "./checks";
import { saveDaily, type SaveState } from "./actions";
import { CHECK_SYSTEM } from "../service/shared";

const ICON: Record<CheckKey, LucideIcon> = {
  firewall: Shield, wan: Globe, vpn: Network, core_switch: Network, wifi: Wifi, cctv: Cctv, ups: Zap,
};
const PILL: Record<CheckResult, string> = { OK: "t-ok", NG: "t-bad", "N/A": "t-grey" };

type Props = {
  date: string;
  today: string;
  existing: DailyRow | null;
  defaultChecker: string;
  users: string[];
  canEdit: boolean;
};

export default function DailyForm({ date, today, existing, defaultChecker, users, canEdit }: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState<SaveState, FormData>(saveDaily, {});
  const [results, setResults] = useState<Partial<Record<CheckKey, CheckResult>>>(() =>
    Object.fromEntries(CHECKS.map((c) => [c.k, existing?.[c.k] ?? undefined])),
  );
  const [remark, setRemark] = useState(existing?.remark ?? "");
  const [confirmIncomplete, setConfirmIncomplete] = useState(false);
  const done = CHECKS.filter((c) => results[c.k]).length;
  const missing = CHECKS.length - done;
  const ngs = CHECKS.filter((c) => results[c.k] === "NG");

  const incident = ngs.length > 0 && new URLSearchParams({
    type: "Incident",
    system: CHECK_SYSTEM[ngs[0].k],
    priority: "P2",
    detail: `Daily Check ${thDate(date)} NG: ${ngs.map((c) => c.th).join(", ")}${remark ? ` — ${remark}` : ""}`,
  });

  return (
    <form
      action={action}
      onSubmit={(e) => {
        // Saving with unanswered checks is allowed (the day counts as incomplete) but must be confirmed.
        if (missing > 0 && !confirmIncomplete) {
          e.preventDefault();
          setConfirmIncomplete(true);
        }
      }}
      className="flex flex-col gap-3"
    >
      <section className="card !p-4">
        <div className="row" style={{ gap: 12 }}>
          <div className="min-w-0 flex-1">
            <label className="small muted row" style={{ gap: 6 }}>
              <CalendarDays className="size-4" />
              <span className="truncate">{longThaiDate(date)}</span>
              <input
                type="date" name="check_date" value={date} max={today} aria-label="เลือกวันที่"
                onChange={(e) => e.target.value && router.push(`/daily?date=${e.target.value}`)}
                className="ml-auto w-[30px] cursor-pointer opacity-70 [&::-webkit-datetime-edit]:hidden"
              />
            </label>
            <h2 className="h2" style={{ marginTop: 2 }}>เช็คประจำวัน · ห้อง Server</h2>
          </div>
          <div className="text-right">
            <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{done}<span className="muted" style={{ fontSize: 15 }}>/7</span></div>
            <div className="small muted">ข้อ</div>
          </div>
        </div>
        <div className="prog" style={{ marginTop: 12 }} role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={7} aria-label="ความคืบหน้า">
          <i style={{ width: `${(done / 7) * 100}%` }} />
        </div>
        {existing && (
          <p className="small muted mt-2">มีบันทึกของ {thDate(date)} แล้ว — บันทึกอีกครั้งจะแก้รายการเดิม (ประวัติถูกเก็บไว้)</p>
        )}
      </section>

      {incident && (
        <div className="banner bad" role="alert" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
          <div className="row" style={{ gap: 10 }}>
            <TriangleAlert className="size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <div>พบ NG {ngs.length} ข้อ</div>
              <div className="small" style={{ fontWeight: 500, opacity: 0.9 }}>{ngs.map((c) => c.th).join(", ")}</div>
            </div>
          </div>
          {canEdit && (
            <Link className="btn" href={`/service/new?${incident}`} style={{ margin: 0, background: "#fff", color: "#A11D1D", height: 44 }}>
              เปิดงาน Incident<ChevronRight className="size-4" />
            </Link>
          )}
        </div>
      )}

      {canEdit && (
        <>
          <button type="button" className="btn btn-secondary btn-lg btn-block"
            style={{ borderStyle: "dashed", borderWidth: 1.5, color: "var(--ok-fg)", borderColor: "var(--ok)" }}
            onClick={() => { setResults(Object.fromEntries(CHECKS.map((c) => [c.k, "OK"]))); setConfirmIncomplete(false); }}>
            <CheckCheck className="size-5" />ทุกข้อ OK
          </button>
          <div className="small muted text-center" style={{ marginTop: -6 }}>กดครั้งเดียวตั้งทุกข้อเป็น OK แล้วค่อยแก้ข้อที่ไม่ปกติ</div>
        </>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {CHECKS.map((c, i) => {
          const Icon = ICON[c.k];
          const v = results[c.k];
          return (
            <div key={c.k} className={`chk ${v === "NG" ? "ng" : ""}`}>
              <input type="hidden" name={c.k} value={v ?? ""} />
              <div className="row" style={{ gap: 10, marginBottom: 12 }}>
                <span className="kchip"><Icon className="size-[18px]" /></span>
                <div className="min-w-0 flex-1">
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{i + 1}. {c.th}</div>
                  <div className="small muted ellip">{c.hint}</div>
                </div>
                <span className={`pill sm ${v ? PILL[v] : "t-grey"}`}>{v ?? "ยังไม่เลือก"}</span>
              </div>
              <div className="okng" role="group" aria-label={c.th}>
                {RESULTS.map((r) => {
                  const on = v === r;
                  return (
                    <button key={r} type="button" disabled={!canEdit} aria-pressed={on}
                      className={on ? (r === "OK" ? "ok" : r === "NG" ? "ng" : "na") : ""}
                      onClick={() => { setResults((x) => ({ ...x, [c.k]: r })); setConfirmIncomplete(false); }}>
                      {on && r !== "N/A" && (r === "OK" ? <Check className="size-4" /> : <TriangleAlert className="size-4" />)}{r}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <section className="card !p-4">
        <div className="field">
          <label htmlFor="remark">หมายเหตุ{ngs.length > 0 && <> (จำเป็นเมื่อ NG)<span className="req" aria-hidden="true">*</span></>}</label>
          <textarea id="remark" name="remark" rows={3} value={remark} onChange={(e) => setRemark(e.target.value)} readOnly={!canEdit}
            className={`input ${ngs.length > 0 && !remark.trim() ? "err" : ""}`}
            placeholder={ngs.length ? "เช่น CAM-07 ลานจอดรถ ไม่มีภาพตั้งแต่ 06:10 — สงสัยสาย PoE" : ""} />
        </div>
        <div className="field mt-3">
          <label htmlFor="checker">ผู้ตรวจ<span className="req" aria-hidden="true">*</span></label>
          <input id="checker" name="checker" list="daily-users" defaultValue={defaultChecker} readOnly={!canEdit} required className="input" />
          <datalist id="daily-users">{users.map((u) => <option key={u} value={u} />)}</datalist>
        </div>
      </section>

      {confirmIncomplete && missing > 0 && (
        <p className="banner warn small">ยังไม่ได้เลือก {missing} ข้อ — วันนี้จะนับว่า “ไม่ครบ” กดบันทึกอีกครั้งเพื่อยืนยัน</p>
      )}
      {state.error && <p className="ierr">{state.error}</p>}
      {state.ok && <p className="banner info small">{state.ok}</p>}

      {canEdit && (
        <div className="sticky-foot -mx-3 rounded-t-2xl sm:mx-0 sm:rounded-2xl">
          <button type="submit" disabled={pending} className="btn btn-primary btn-lg btn-block">
            {pending ? "กำลังบันทึก…" : confirmIncomplete ? `ยืนยันบันทึก (ขาด ${missing} ข้อ)` : `บันทึก Daily Check · ${done}/7`}
          </button>
        </div>
      )}
    </form>
  );
}
