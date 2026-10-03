"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { FileText, Languages, Stamp } from "lucide-react";
import { saveDoc, type SaveState } from "./actions";
import { DOC_STATUSES, type DocRow } from "./shared";

type Props = { rec: Partial<DocRow>; others: { rev: string; status: string }[]; users: string[]; canEdit: boolean; today: string };

export default function DocForm({ rec, others, users, canEdit, today }: Props) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveDoc, {});
  const [status, setStatus] = useState<string>(rec.status ?? "Draft");
  const ro = !canEdit;
  const live = others.filter((o) => o.status === "Active" || o.status === "Under Revision");

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={rec.id ?? ""} />
      <input type="hidden" name="updated_at" value={rec.updated_at ?? ""} />
      <datalist id="doc-users">{users.map((u) => <option key={u} value={u} />)}</datalist>

      <section className="card flex flex-col gap-4 !p-4 sm:!p-5">
        <div className="section-t !mb-0"><FileText className="ic size-4" />เอกสาร</div>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
          <div className="field">
            <label htmlFor="doc_no">เลขที่เอกสาร<span className="req">*</span></label>
            <input id="doc_no" name="doc_no" defaultValue={rec.doc_no ?? ""} readOnly={ro || !!rec.doc_no} required className="input mono uppercase" placeholder="WDIT-F-IT-03" />
          </div>
          <div className="field">
            <label htmlFor="rev">Rev.<span className="req">*</span></label>
            <input id="rev" name="rev" defaultValue={rec.rev ?? "00"} readOnly={ro} required className="input mono" />
          </div>
        </div>
        <div className="field">
          <span className="flabel">สถานะ<span className="req">*</span></span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {DOC_STATUSES.map((s) => (
              <label key={s.v} className={`radio-card !items-center ${status === s.v ? "on" : ""}`}>
                <input type="radio" name="status" value={s.v} checked={status === s.v} onChange={() => setStatus(s.v)} disabled={ro} className="sr-only" />
                <span className="rd !mt-0" />
                <span className={`pill sm ${s.tone}`}>{s.th}</span>
              </label>
            ))}
          </div>
        </div>
        {status === "Active" && live.length > 0 && (
          <label className="mode small cursor-pointer !items-center">
            <input type="checkbox" name="retire_old" defaultChecked className="size-4 accent-[var(--accent)]" />
            <span>ตั้งฉบับเก่า {live.map((o) => `Rev. ${o.rev}`).join(", ")} เป็น <b>Obsolete</b> เมื่อบันทึก (ตามกฎทะเบียนเอกสาร)</span>
          </label>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field">
            <label htmlFor="effective">วันที่มีผล{status === "Active" && <span className="req">*</span>}</label>
            <input id="effective" name="effective" type="date" defaultValue={rec.effective ?? ""} max={addYear(today)} readOnly={ro} className="input" />
          </div>
        </div>
      </section>

      <section className="card flex flex-col gap-4 !p-4 sm:!p-5">
        <div className="section-t !mb-0"><Languages className="ic size-4" />ชื่อเอกสาร 3 ภาษา</div>
        <div className="field">
          <label htmlFor="title_en">English<span className="req">*</span></label>
          <input id="title_en" name="title_en" defaultValue={rec.title_en ?? ""} readOnly={ro} required className="input" />
        </div>
        <div className="field">
          <label htmlFor="title_th">ไทย</label>
          <input id="title_th" name="title_th" defaultValue={rec.title_th ?? ""} readOnly={ro} className="input" />
        </div>
        <div className="field">
          <label htmlFor="title_cn">中文</label>
          <input id="title_cn" name="title_cn" defaultValue={rec.title_cn ?? ""} readOnly={ro} className="input" />
        </div>
      </section>

      <section className="card flex flex-col gap-4 !p-4 sm:!p-5">
        <div className="section-t !mb-0"><Stamp className="ic size-4" />ผู้จัดทำ / ผู้อนุมัติ</div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field">
            <label htmlFor="prepared_by">ผู้จัดทำ</label>
            <input id="prepared_by" name="prepared_by" list="doc-users" defaultValue={rec.prepared_by ?? ""} readOnly={ro} className="input" />
          </div>
          <div className="field">
            <label htmlFor="approved_by">ผู้อนุมัติ</label>
            <input id="approved_by" name="approved_by" list="doc-users" defaultValue={rec.approved_by ?? ""} readOnly={ro} className="input" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="remark">หมายเหตุ</label>
          <textarea id="remark" name="remark" rows={2} defaultValue={rec.remark ?? ""} readOnly={ro} className="input" placeholder="เช่น สิ่งที่แก้ใน Rev. นี้" />
        </div>
      </section>

      {state.error && <p className="ierr">{state.error}</p>}
      <div className="sticky-foot -mx-3 rounded-t-2xl sm:mx-0 sm:rounded-2xl">
        {canEdit && <button type="submit" disabled={pending} className="btn btn-primary btn-lg flex-1">{pending ? "กำลังบันทึก…" : "บันทึก"}</button>}
        <Link href="/documents" className="btn btn-secondary btn-lg">กลับ</Link>
      </div>
    </form>
  );
}

function addYear(iso: string) {
  return `${Number(iso.slice(0, 4)) + 1}${iso.slice(4)}`;
}
