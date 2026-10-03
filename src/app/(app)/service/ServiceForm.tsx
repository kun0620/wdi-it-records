"use client";

import { useActionState, useRef } from "react";
import Link from "next/link";
import type { AssetOption, Lists } from "@/lib/lists";
import { saveService, type SaveState } from "./actions";
import type { ServiceRow } from "./shared";

type Props = {
  rec: Partial<ServiceRow>;
  lists: Lists;
  assets: AssetOption[];
  canEdit: boolean;
  today: string;
  now: string;
};

const input = "w-full rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20 read-only:opacity-70";

function Field({ label, req, full, children }: { label: string; req?: boolean; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block space-y-1 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-sm">{label}{req && <span className="text-red-600"> *</span>}</span>
      {children}
    </label>
  );
}

export default function ServiceForm({ rec, lists, assets, canEdit, today, now }: Props) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveService, {});
  const form = useRef<HTMLFormElement>(null);
  const isNew = !rec.id;
  const ro = !canEdit;

  const select = (name: keyof ServiceRow, list: string, opts: { req?: boolean; blank?: boolean } = {}) => {
    const items = lists[list] ?? [];
    const cur = rec[name] as string | null | undefined;
    return (
      <select name={name} defaultValue={cur ?? ""} required={opts.req} disabled={ro} className={input}>
        {opts.blank !== false && <option value=""></option>}
        {items.map((i) => <option key={i.value} value={i.value}>{i.label ?? i.value}</option>)}
        {cur && !items.some((i) => i.value === cur) && <option value={cur}>{cur}</option>}
      </select>
    );
  };

  // Fill close date/time with "now" (Thai time) the moment the job is marked Closed.
  const markClosed = (setStatus: boolean) => {
    const f = form.current!;
    const el = (n: string) => f.elements.namedItem(n) as HTMLInputElement | HTMLSelectElement;
    if (setStatus) el("status").value = "Closed";
    if (!el("close_date").value) { el("close_date").value = today; el("close_time").value = now; }
    (el("action") as HTMLInputElement).focus();
  };

  return (
    <form ref={form} action={action} className="space-y-4">
      <input type="hidden" name="id" value={rec.id ?? ""} />
      <input type="hidden" name="updated_at" value={rec.updated_at ?? ""} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="เลขที่คำขอ">
          <input readOnly value={rec.req_no ?? "ออกเลขอัตโนมัติเมื่อบันทึก"} className={input} />
        </Field>
        <Field label="สถานะ" req>
          <select name="status" defaultValue={rec.status ?? "Open"} required disabled={ro} className={input}
            onChange={(e) => e.target.value === "Closed" && markClosed(false)}>
            {(lists.status ?? []).map((i) => <option key={i.value} value={i.value}>{i.value}</option>)}
          </select>
        </Field>
        <Field label="วันที่แจ้ง" req>
          <input type="date" name="req_date" defaultValue={rec.req_date ?? today} max={today} required readOnly={ro} className={input} />
        </Field>
        <Field label="เวลา">
          <input type="time" name="req_time" defaultValue={rec.req_time?.slice(0, 5) ?? (isNew ? now : "")} readOnly={ro} className={input} />
        </Field>
        <Field label="ผู้แจ้ง" req>
          <input name="requester" list="svc-users" defaultValue={rec.requester ?? ""} required readOnly={ro} autoComplete="off" className={input} />
          <datalist id="svc-users">{(lists.user ?? []).map((u) => <option key={u.value} value={u.value} />)}</datalist>
        </Field>
        <Field label="แผนก">{select("dept", "dept")}</Field>
        <Field label="ทรัพย์สินที่เกี่ยวข้อง" full>
          <select name="asset_id" defaultValue={rec.asset_id ?? ""} disabled={ro} className={input}>
            <option value="">— ไม่ระบุ —</option>
            {assets.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </Field>
        <Field label="ประเภท" req>{select("type", "type", { req: true })}</Field>
        <Field label="ระบบ">{select("system", "system")}</Field>
        <Field label="ความสำคัญ" req full>{select("priority", "priority", { req: true, blank: false })}</Field>
        <Field label="รายละเอียด" full>
          <textarea name="detail" rows={3} defaultValue={rec.detail ?? ""} readOnly={ro} className={input} />
        </Field>
        <Field label="วิธีแก้ไข" full>
          <textarea name="action" rows={3} defaultValue={rec.action ?? ""} readOnly={ro} className={input} />
        </Field>
        <Field label="ส่งต่อ">{select("escalation", "escalation", { blank: false })}</Field>
        <Field label="เลขอ้างอิงการส่งต่อ">
          <input name="esc_ref" defaultValue={rec.esc_ref ?? ""} readOnly={ro} className={input} />
        </Field>
        <Field label="วันที่ปิดงาน">
          <input type="date" name="close_date" defaultValue={rec.close_date ?? ""} max={today} readOnly={ro} className={input} />
        </Field>
        <Field label="เวลาปิด">
          <input type="time" name="close_time" defaultValue={rec.close_time?.slice(0, 5) ?? ""} readOnly={ro} className={input} />
        </Field>
        {!isNew && (
          <Field label="เวลาที่ใช้ (ชม.)">
            <input readOnly value={rec.hours ?? "–"} className={input} />
          </Field>
        )}
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex flex-wrap gap-3">
        {canEdit && (
          <button type="submit" disabled={pending} className="rounded-md bg-foreground px-5 py-2.5 text-background disabled:opacity-50">
            {pending ? "กำลังบันทึก…" : "บันทึก"}
          </button>
        )}
        {canEdit && !isNew && rec.status !== "Closed" && (
          <button type="button" onClick={() => markClosed(true)} className="rounded-md border border-black/15 px-4 py-2.5 dark:border-white/20">
            ✓ ปิดงานตอนนี้
          </button>
        )}
        <Link href="/service" className="px-2 py-2.5 text-sm opacity-70">ยกเลิก</Link>
      </div>
    </form>
  );
}
