"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, CheckCheck, ChevronRight, CircleCheck } from "lucide-react";
import { longThaiDate, thDate } from "@/lib/dates";
import { CHECKS, RESULTS, incidentHref, recordedLate, type CheckKey, type CheckResult, type DailyRow } from "./checks";
import { saveDaily, type SaveState } from "./actions";

const LEAVE_MSG = "ผลเช็ควันนี้ยังไม่ได้บันทึก ออกจากหน้านี้แล้วผลที่เลือกไว้จะหาย ต้องการออกหรือไม่?";

type Results = Partial<Record<CheckKey, CheckResult>>;
type Notes = Partial<Record<CheckKey, string>>;

type Props = {
  date: string;
  today: string;
  existing: DailyRow | null;
  defaultChecker: string;
  users: string[];
  canEdit: boolean;
};

const snap = (results: Results, notes: Notes, remark: string, checker: string) =>
  JSON.stringify([CHECKS.map((c) => results[c.k] ?? ""), CHECKS.map((c) => notes[c.k]?.trim() ?? ""), remark.trim(), checker.trim()]);

const hhmm = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export default function DailyForm({ date, today, existing, defaultChecker, users, canEdit }: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState<SaveState, FormData>(saveDaily, {});
  const [results, setResults] = useState<Results>(() =>
    Object.fromEntries(CHECKS.map((c) => [c.k, existing?.[c.k] ?? undefined])),
  );
  const [notes, setNotes] = useState<Notes>({});
  const [remark, setRemark] = useState(existing?.remark ?? "");
  const [confirmIncomplete, setConfirmIncomplete] = useState(false);
  const [tried, setTried] = useState(false);
  const [checker, setChecker] = useState(defaultChecker);
  const [baseline, setBaseline] = useState(() => snap(results, notes, remark, checker));
  const submitted = useRef<string | null>(null);

  const done = CHECKS.filter((c) => results[c.k]).length;
  const missing = CHECKS.length - done;
  const ngs = CHECKS.filter((c) => results[c.k] === "NG");
  // Each NG needs its own note unless the general remark already explains it.
  const noteMissing = (k: CheckKey) => results[k] === "NG" && !notes[k]?.trim() && !remark.trim();
  const ngWithoutNote = ngs.filter((c) => noteMissing(c.k));
  const dirty = canEdit && snap(results, notes, remark, checker) !== baseline;
  // A saved day with nothing changed shows a calm "saved" status instead of a save button.
  const saved = !!existing && !dirty;

  // After a successful save the current values become the saved baseline.
  useEffect(() => {
    if (state.ok && submitted.current) {
      setBaseline(submitted.current);
      submitted.current = null;
    }
  }, [state]);

  // Unsaved results: warn on tab close/reload and on in-app link clicks.
  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download") || e.metaKey || e.ctrlKey) return;
      if (new URL(a.href, location.href).origin !== location.origin) return;
      if (!window.confirm(LEAVE_MSG)) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  // Sets only the unanswered checks to OK, so an NG already chosen is never overwritten.
  const fillBtn = (
    <button type="button" className="btn btn-secondary fill" disabled={missing === 0}
      onClick={() => {
        setResults((x) => Object.fromEntries(CHECKS.map((c) => [c.k, x[c.k] ?? "OK"])));
        setConfirmIncomplete(false);
      }}>
      <CheckCheck className="size-5" />{done === 0 ? "ทุกข้อ OK" : missing === 0 ? "ครบ 7 ข้อ" : `ที่เหลือ ${missing} OK`}
    </button>
  );

  const pick = (k: CheckKey, r: CheckResult) => {
    setResults((x) => ({ ...x, [k]: r }));
    setConfirmIncomplete(false);
  };

  return (
    <form
      action={action}
      onSubmit={(e) => {
        // NG without a note: stop here and point at the first empty note.
        if (ngWithoutNote.length > 0) {
          e.preventDefault();
          setTried(true);
          document.getElementById(`note_${ngWithoutNote[0].k}`)?.focus();
          return;
        }
        // Saving with unanswered checks is allowed (the day counts as incomplete) but must be confirmed.
        if (missing > 0 && !confirmIncomplete) {
          e.preventDefault();
          setConfirmIncomplete(true);
          return;
        }
        submitted.current = snap(results, notes, remark, checker);
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
                onChange={(e) => {
                  if (!e.target.value) return;
                  if (dirty && !window.confirm(LEAVE_MSG)) return;
                  router.push(`/daily?date=${e.target.value}`);
                }}
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
        {existing && dirty && (
          <p className="small muted mt-2">
            กำลังแก้บันทึกของ {thDate(date)} — บันทึกแล้วจะแทนผลเดิม (ประวัติเดิมถูกเก็บไว้)
          </p>
        )}
        {!existing && date < today && (
          <p className="banner warn small mt-2">บันทึกย้อนหลังของ {thDate(date)} — ใส่ผลที่ตรวจจริงในวันนั้น รายการนี้จะแสดงว่า “บันทึกย้อนหลัง”</p>
        )}
      </section>

      {!canEdit && <p className="banner info small">บัญชีนี้ดูได้อย่างเดียว — แก้ผลเช็คได้เฉพาะผู้มีสิทธิ์ editor</p>}

      <div className="grid gap-2 sm:grid-cols-2">
        {CHECKS.map((c, i) => {
          const v = results[c.k];
          const showErr = tried && noteMissing(c.k);
          return (
            <div key={c.k} className={`chk line ${v === "NG" ? "ng" : ""}`}>
              <input type="hidden" name={c.k} value={v ?? ""} />
              <div className="chk-h">
                <div className="nm">
                  <span className="n">{i + 1}</span>{c.name}
                  <span className="hint">{c.hint}</span>
                </div>
                <div className="okng compact" role="group" aria-label={c.name}>
                  {RESULTS.map((r) => {
                    const on = v === r;
                    return (
                      <button key={r} type="button" disabled={!canEdit} aria-pressed={on}
                        className={on ? (r === "OK" ? "ok" : r === "NG" ? "ng" : "na") : ""}
                        onClick={() => pick(c.k, r)}>
                        {on && r === "OK" && <Check className="size-4" />}{r}
                      </button>
                    );
                  })}
                </div>
              </div>
              {v === "NG" && (
                <div className="field chk-more">
                  <label htmlFor={`note_${c.k}`}>อาการที่พบ<span className="req" aria-hidden="true">*</span></label>
                  <textarea id={`note_${c.k}`} name={`note_${c.k}`} rows={2} readOnly={!canEdit}
                    value={notes[c.k] ?? ""} onChange={(e) => setNotes((x) => ({ ...x, [c.k]: e.target.value }))}
                    aria-invalid={showErr || undefined} aria-describedby={showErr ? `note_${c.k}_err` : undefined}
                    className={`input ${showErr ? "err" : ""}`}
                    placeholder="เช่น ไม่มีภาพตั้งแต่ 06:10 — สงสัยสาย PoE" />
                  {showErr && <p id={`note_${c.k}_err`} className="ierr mt-1">ใส่อาการที่พบของ {c.name} ก่อนบันทึก</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <section className="card !p-4">
        <div className="field">
          <label htmlFor="remark">{ngs.length > 0 ? "หมายเหตุอื่น (ถ้ามี)" : "หมายเหตุ"}</label>
          <textarea id="remark" name="remark" rows={3} value={remark} onChange={(e) => setRemark(e.target.value)} readOnly={!canEdit}
            className="input" />
        </div>
        <div className="field mt-3">
          <label htmlFor="checker">ผู้ตรวจ<span className="req" aria-hidden="true">*</span></label>
          <input id="checker" name="checker" list="daily-users" value={checker} onChange={(e) => setChecker(e.target.value)} readOnly={!canEdit} required className="input" />
          <datalist id="daily-users">{users.map((u) => <option key={u} value={u} />)}</datalist>
        </div>
      </section>

      <div aria-live="polite" className="contents">
        {tried && ngWithoutNote.length > 0 && (
          <p className="banner bad small" role="alert">ยังไม่ได้ใส่อาการที่พบของ {ngWithoutNote.map((c) => c.name).join(", ")}</p>
        )}
        {confirmIncomplete && missing > 0 && (
          <p className="banner warn small">ยังไม่ได้เลือก {missing} ข้อ — วันนี้จะนับว่า “ไม่ครบ” กดบันทึกอีกครั้งเพื่อยืนยัน</p>
        )}
        {state.error && <p className="banner bad small" role="alert">{state.error}</p>}
      </div>

      {canEdit && saved && existing && (
        <div className="sticky-foot daily-foot -mx-3 rounded-t-2xl sm:mx-0 sm:rounded-2xl">
          <div className={`saved ${ngs.length ? "t-bad" : missing ? "t-warn" : "t-ok"}`} role="status">
            <CircleCheck className="size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <b>บันทึกแล้ว · {hhmm(existing.updated_at)} น.{recordedLate(existing) && " · ย้อนหลัง"}</b>
              <span>
                {ngs.length ? `NG ${ngs.length} ข้อ` : missing ? `ยังขาด ${missing} ข้อ` : "OK ครบ 7 ข้อ"} · แตะผลด้านบนเพื่อแก้ไข
              </span>
            </div>
            {ngs.length > 0 && (
              <Link className="btn btn-secondary shrink-0"
                href={incidentHref(date, existing.checker, ngs.map((c) => ({ k: c.k, name: c.name })), existing.remark ?? "")}>
                เปิด Incident<ChevronRight className="size-4" />
              </Link>
            )}
          </div>
        </div>
      )}

      {canEdit && !saved && (
        <div className="sticky-foot daily-foot -mx-3 rounded-t-2xl sm:mx-0 sm:rounded-2xl">
          {/* The fill button keeps its place (disabled when all answered) so a quick second tap never lands on Save. */}
          {ngs.length > 0 && fillBtn}
          <div className="acts">
            {ngs.length > 0 ? (
              <>
                <button type="submit" disabled={pending} className="btn btn-secondary" style={{ flex: "0 1 auto" }}>
                  บันทึกอย่างเดียว
                </button>
                <button type="submit" name="then" value="incident" disabled={pending} className="btn btn-primary">
                  {pending ? "กำลังบันทึก…" : <>บันทึก + เปิด Incident<ChevronRight className="size-4" /></>}
                </button>
              </>
            ) : (
              <>
                {fillBtn}
                <button type="submit" disabled={pending} className="btn btn-primary">
                  {pending ? "กำลังบันทึก…" : confirmIncomplete ? `ยืนยันบันทึก (ขาด ${missing})` : `บันทึก · ${done}/7`}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
