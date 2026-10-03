"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { HardDrive, Lock, MapPin, Network, NotebookPen, Receipt } from "lucide-react";
import { saveAsset, type SaveState } from "./actions";
import { ASSET_STATUSES, CATEGORY_SUGGESTIONS, isComputer, type AssetRow } from "./shared";

type Props = { rec: Partial<AssetRow>; users: string[]; depts: string[]; positions?: string[]; canEdit: boolean; today: string; lastEdit?: string };

function Field({ id, label, req, full, hint, children }: { id: string; label: string; req?: boolean; full?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className={`field ${full ? "sm:col-span-2" : ""}`}>
      <label htmlFor={id}>{label}{req && <span className="req" aria-hidden="true">*</span>}</label>
      {children}
      {hint && <div className="ihint">{hint}</div>}
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="section-t"><Icon className="ic size-4" />{title}</div>
      <div className="grid gap-x-4 gap-y-3.5 sm:grid-cols-2">{children}</div>
    </div>
  );
}

// "2 ปี 3 เดือน" left until a date (or "หมดแล้ว")
function remaining(today: string, end: string) {
  const [y1, m1] = today.split("-").map(Number), [y2, m2] = end.split("-").map(Number);
  const months = (y2 - y1) * 12 + (m2 - m1);
  if (end < today) return "หมดประกันแล้ว";
  if (months < 1) return "เหลือไม่ถึง 1 เดือน";
  return `เหลือ ${Math.floor(months / 12) ? `${Math.floor(months / 12)} ปี ` : ""}${months % 12 ? `${months % 12} เดือน` : ""}`.trim();
}

export default function AssetForm({ rec, users, depts, positions = [], canEdit, today, lastEdit }: Props) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveAsset, {});
  const [category, setCategory] = useState(rec.category ?? "");
  const computer = isComputer(category, rec.asset_tag);
  const ro = !canEdit;
  const text = (k: keyof AssetRow, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input id={`f-${k}`} name={k} defaultValue={(rec[k] as string | null) ?? ""} readOnly={ro} {...extra} className={`input ${extra.className ?? ""}`} />
  );

  return (
    <form action={action} className="card flex flex-col gap-5 !p-4 sm:!p-5">
      <input type="hidden" name="id" value={rec.id ?? ""} />
      <input type="hidden" name="updated_at" value={rec.updated_at ?? ""} />
      <div className="card-h !mb-0">
        <h2 className="h2">{rec.id ? "แก้ไขข้อมูล" : "ข้อมูลทรัพย์สิน"}</h2>
        {lastEdit && <span className="small muted">แก้ล่าสุด {lastEdit}</span>}
      </div>

      <Section icon={HardDrive} title="ข้อมูลเครื่อง">
        <Field id="f-tag" label="แท็ก" hint="สร้างอัตโนมัติ แก้ไขไม่ได้">
          <div className="iwrap">
            <input id="f-tag" readOnly value={rec.asset_tag ?? "ออกเลขอัตโนมัติเมื่อบันทึก"} className="input ro mono pr" />
            <Lock className="ic suffix size-4" />
          </div>
        </Field>
        <Field id="f-status" label="สถานะ" req>
          <select id="f-status" name="status" defaultValue={rec.status ?? "In Stock"} disabled={ro} className="input">
            {ASSET_STATUSES.map((s) => <option key={s.v} value={s.v}>{s.th} · {s.v}</option>)}
          </select>
        </Field>
        <Field id="f-category" label="ประเภท" req hint="กำหนดตัวย่อของแท็ก: Desktop → PC, Laptop → NB, Network → NW">
          {text("category", { list: "asset-cats", required: true, autoComplete: "off", onChange: (e) => setCategory(e.target.value) })}
          <datalist id="asset-cats">{CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field id="f-name" label="ชื่อเครื่อง">{text("name", { className: "mono" })}</Field>
        <Field id="f-manufacturer" label="ยี่ห้อ">{text("manufacturer")}</Field>
        <Field id="f-model" label="รุ่น">{text("model")}</Field>
        <Field id="f-serial" label="Serial No." full>{text("serial", { autoComplete: "off", className: "mono" })}</Field>
      </Section>
      <hr className="divider" />

      <Section icon={MapPin} title="ผู้ใช้และที่ตั้ง">
        <Field id="f-user_name" label="ผู้ใช้">
          {text("user_name", { list: "asset-users", autoComplete: "off" })}
          <datalist id="asset-users">{users.map((u) => <option key={u} value={u} />)}</datalist>
        </Field>
        {computer ? (
          <Field id="f-position" label="ตำแหน่ง" hint="ตำแหน่งงานของผู้ใช้ (Desktop / Laptop)">
            {text("position", { list: "asset-positions", autoComplete: "off" })}
            <datalist id="asset-positions">{positions.map((p) => <option key={p} value={p} />)}</datalist>
          </Field>
        ) : (
          <input type="hidden" name="position" value={rec.position ?? ""} />
        )}
        <Field id="f-department" label="แผนก">
          {text("department", { list: "asset-depts", autoComplete: "off" })}
          <datalist id="asset-depts">{depts.map((d) => <option key={d} value={d} />)}</datalist>
        </Field>
        <Field id="f-location" label="ที่ตั้ง" full={!computer}>{text("location")}</Field>
      </Section>
      <hr className="divider" />

      <Section icon={Network} title="เครือข่าย">
        <Field id="f-ip_address" label="IP">{text("ip_address", { inputMode: "decimal", className: "mono" })}</Field>
        <Field id="f-mac" label="MAC">{text("mac", { className: "mono" })}</Field>
      </Section>
      <hr className="divider" />

      <Section icon={Receipt} title="การจัดซื้อและประกัน">
        <Field id="f-purchase_date" label="วันที่ซื้อ">{text("purchase_date", { type: "date", max: today })}</Field>
        <Field id="f-warranty_end" label="หมดประกัน" hint={rec.warranty_end ? remaining(today, rec.warranty_end) : undefined}>
          {text("warranty_end", { type: "date" })}
        </Field>
        <Field id="f-vendor" label="ผู้ขาย">{text("vendor")}</Field>
        <Field id="f-price" label="ราคา (บาท)">
          <input id="f-price" name="price" inputMode="decimal" defaultValue={rec.price ?? ""} readOnly={ro} className="input" />
        </Field>
      </Section>
      <hr className="divider" />

      <Section icon={NotebookPen} title="หมายเหตุ">
        <div className="field sm:col-span-2">
          <textarea name="remark" rows={3} defaultValue={rec.remark ?? ""} readOnly={ro} className="input" aria-label="หมายเหตุ" />
        </div>
      </Section>

      {state.error && <p className="ierr">{state.error}</p>}

      <div className="flex flex-wrap gap-3">
        {canEdit && <button type="submit" disabled={pending} className="btn btn-primary btn-lg">{pending ? "กำลังบันทึก…" : "บันทึก"}</button>}
        <Link href="/assets" className="btn btn-ghost btn-lg">กลับไปรายการ</Link>
      </div>
    </form>
  );
}
