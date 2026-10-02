"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { saveAsset, type SaveState } from "./actions";
import { ASSET_STATUSES, CATEGORY_SUGGESTIONS, isComputer, type AssetRow } from "./shared";

type Props = { rec: Partial<AssetRow>; users: string[]; depts: string[]; positions?: string[]; canEdit: boolean; today: string };

const input = "w-full rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20 read-only:opacity-70";

function Field({ label, req, full, hint, children }: { label: string; req?: boolean; full?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className={`block space-y-1 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-sm">{label}{req && <span className="text-red-600"> *</span>}</span>
      {children}
      {hint && <span className="block text-xs opacity-60">{hint}</span>}
    </label>
  );
}

export default function AssetForm({ rec, users, depts, positions = [], canEdit, today }: Props) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveAsset, {});
  const [category, setCategory] = useState(rec.category ?? "");
  const computer = isComputer(category, rec.asset_tag);
  const ro = !canEdit;
  const text = (k: keyof AssetRow, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input name={k} defaultValue={(rec[k] as string | null) ?? ""} readOnly={ro} className={input} {...extra} />
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={rec.id ?? ""} />
      <input type="hidden" name="updated_at" value={rec.updated_at ?? ""} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Asset Tag" hint="ระบบออกเลขให้เมื่อบันทึก (ยกเว้นสถานะแผนจัดซื้อ) และแก้ไม่ได้">
          <input readOnly value={rec.asset_tag ?? "ออกเลขอัตโนมัติ"} className={input} />
        </Field>
        <Field label="สถานะ" req>
          <select name="status" defaultValue={rec.status ?? "In Stock"} disabled={ro} className={input}>
            {ASSET_STATUSES.map((s) => <option key={s.v} value={s.v}>{s.th} · {s.v}</option>)}
          </select>
        </Field>
        <Field label="ประเภท" req hint="กำหนดตัวย่อของแท็ก เช่น Desktop → PC, Laptop → NB, Network → NW">
          {text("category", { list: "asset-cats", required: true, autoComplete: "off", onChange: (e) => setCategory(e.target.value) })}
          <datalist id="asset-cats">{CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="ชื่อ">{text("name")}</Field>
        <Field label="ยี่ห้อ">{text("manufacturer")}</Field>
        <Field label="รุ่น">{text("model")}</Field>
        <Field label="Serial No." full>{text("serial", { autoComplete: "off" })}</Field>

        <Field label="ผู้ใช้">
          {text("user_name", { list: "asset-users", autoComplete: "off" })}
          <datalist id="asset-users">{users.map((u) => <option key={u} value={u} />)}</datalist>
        </Field>
        {computer ? (
          <Field label="ตำแหน่ง" hint="ตำแหน่งงานของผู้ใช้ (เฉพาะ Desktop / Laptop)">
            {text("position", { list: "asset-positions", autoComplete: "off" })}
            <datalist id="asset-positions">{positions.map((p) => <option key={p} value={p} />)}</datalist>
          </Field>
        ) : (
          <input type="hidden" name="position" value={rec.position ?? ""} />
        )}
        <Field label="แผนก">
          {text("department", { list: "asset-depts", autoComplete: "off" })}
          <datalist id="asset-depts">{depts.map((d) => <option key={d} value={d} />)}</datalist>
        </Field>
        <Field label="ที่ตั้ง" full>{text("location")}</Field>
        <Field label="IP Address">{text("ip_address", { inputMode: "decimal" })}</Field>
        <Field label="MAC">{text("mac")}</Field>

        <Field label="วันที่ซื้อ">{text("purchase_date", { type: "date", max: today })}</Field>
        <Field label="วันหมดประกัน">{text("warranty_end", { type: "date" })}</Field>
        <Field label="ผู้ขาย">{text("vendor")}</Field>
        <Field label="ราคา (บาท)">
          <input name="price" inputMode="decimal" defaultValue={rec.price ?? ""} readOnly={ro} className={input} />
        </Field>
        <Field label="หมายเหตุ" full>
          <textarea name="remark" rows={3} defaultValue={rec.remark ?? ""} readOnly={ro} className={input} />
        </Field>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex flex-wrap gap-3">
        {canEdit && (
          <button type="submit" disabled={pending} className="rounded-md bg-foreground px-5 py-2.5 text-background disabled:opacity-50">
            {pending ? "กำลังบันทึก…" : "บันทึก"}
          </button>
        )}
        <Link href="/assets" className="px-2 py-2.5 text-sm opacity-70">กลับไปรายการ</Link>
      </div>
    </form>
  );
}
