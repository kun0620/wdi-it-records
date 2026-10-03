"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CircleCheck, CircleX, FileCheck2, ListChecks, Stamp } from "lucide-react";
import { saveMaint, type SaveState } from "./actions";
import { addMonths, needsSignoff, type MaintRow, type MaintType } from "./shared";
import { thDate } from "@/lib/dates";

type Props = { rec: Partial<MaintRow>; types: MaintType[]; users: string[]; canEdit: boolean; today: string };

export default function MaintForm({ rec, types, users, canEdit, today }: Props) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveMaint, {});
  const [type, setType] = useState(rec.type ?? "");
  const [result, setResult] = useState(rec.result ?? "");
  const [done, setDone] = useState(rec.done_date ?? today);
  const ro = !canEdit;
  const period = types.find((t) => t.name === type)?.every_months;
  const signoff = needsSignoff(type);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={rec.id ?? ""} />
      <input type="hidden" name="updated_at" value={rec.updated_at ?? ""} />
      <datalist id="maint-users">{users.map((u) => <option key={u} value={u} />)}</datalist>

      <section className="card flex flex-col gap-4 !p-4 sm:!p-5">
        <div className="section-t !mb-0"><ListChecks className="ic size-4" />งานที่ทำ</div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field sm:col-span-2">
            <label htmlFor="type">ประเภท<span className="req">*</span></label>
            <select id="type" name="type" value={type} onChange={(e) => setType(e.target.value)} disabled={ro} required className="input">
              <option value="">— เลือก —</option>
              {types.map((t) => <option key={t.name} value={t.name}>{t.name} · ทุก {t.every_months} เดือน</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="done_date">วันที่ทำ<span className="req">*</span></label>
            <input id="done_date" name="done_date" type="date" value={done} max={today} onChange={(e) => setDone(e.target.value)} readOnly={ro} required className="input" />
            {period && result === "Pass" && done && <div className="ihint">ครบกำหนดครั้งถัดไป {thDate(addMonths(done, period))}</div>}
          </div>
          <div className="field">
            <label htmlFor="done_by">ผู้ทำ<span className="req">*</span></label>
            <input id="done_by" name="done_by" list="maint-users" defaultValue={rec.done_by ?? ""} readOnly={ro} required className="input" />
          </div>
        </div>

        <div className="field">
          <span className="flabel">ผล<span className="req">*</span></span>
          <div className="grid grid-cols-2 gap-2">
            {(["Pass", "Fail"] as const).map((r) => (
              <label key={r} className={`radio-card ${result === r ? "on" : ""}`}>
                <input type="radio" name="result" value={r} checked={result === r} onChange={() => setResult(r)} disabled={ro} className="sr-only" />
                <span className="rd" />
                <span className="row" style={{ gap: 6, fontWeight: 600 }}>
                  {r === "Pass" ? <CircleCheck className="size-4 text-[var(--ok-fg)]" /> : <CircleX className="size-4 text-[var(--bad-fg)]" />}
                  {r === "Pass" ? "ผ่าน (Pass)" : "ไม่ผ่าน (Fail)"}
                </span>
              </label>
            ))}
          </div>
          {result === "Fail" && <div className="ihint">ไม่ผ่านจะไม่นับเป็นการทำรอบนี้ — สถานะยังค้างจนกว่าจะมีครั้งที่ผ่าน</div>}
        </div>

        <div className="field">
          <label htmlFor="scope">ขอบเขต</label>
          <textarea id="scope" name="scope" rows={2} defaultValue={rec.scope ?? ""} readOnly={ro} className="input" placeholder="เช่น Windows Update ทุกเครื่องในโดเมน + Firewall firmware" />
        </div>
      </section>

      <section className="card flex flex-col gap-4 !p-4 sm:!p-5">
        <div className="section-t !mb-0"><FileCheck2 className="ic size-4" />หลักฐาน</div>
        <div className="field">
          <label htmlFor="evidence">ที่อยู่ไฟล์ / ลิงก์ PDF ที่มีลายเซ็น</label>
          <input id="evidence" name="evidence" defaultValue={rec.evidence ?? ""} readOnly={ro} className="input mono" placeholder="\\fileserver\IT\QMS\2026-10\patch.pdf" />
        </div>
      </section>

      <section className={`card flex flex-col gap-4 !p-4 sm:!p-5 ${signoff && !rec.approved_by ? "!shadow-[0_0_0_2px_var(--warn),var(--shadow)]" : ""}`}>
        <div className="section-t !mb-0"><Stamp className="ic size-4" />การรับรอง{signoff && <span className="pill sm t-warn ml-1">รายไตรมาสต้องมีหัวหน้าเซ็น</span>}</div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field">
            <label htmlFor="approved_by">ผู้รับรอง</label>
            <input id="approved_by" name="approved_by" list="maint-users" defaultValue={rec.approved_by ?? ""} readOnly={ro} className="input" />
          </div>
          <div className="field">
            <label htmlFor="approval_date">วันที่รับรอง</label>
            <input id="approval_date" name="approval_date" type="date" defaultValue={rec.approval_date ?? ""} max={today} readOnly={ro} className="input" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="remark">หมายเหตุ</label>
          <textarea id="remark" name="remark" rows={2} defaultValue={rec.remark ?? ""} readOnly={ro} className="input" />
        </div>
      </section>

      {state.error && <p className="ierr">{state.error}</p>}
      <div className="sticky-foot -mx-3 rounded-t-2xl sm:mx-0 sm:rounded-2xl">
        {canEdit && <button type="submit" disabled={pending} className="btn btn-primary btn-lg flex-1">{pending ? "กำลังบันทึก…" : "บันทึก"}</button>}
        <Link href="/maintenance" className="btn btn-secondary btn-lg">กลับ</Link>
      </div>
    </form>
  );
}
