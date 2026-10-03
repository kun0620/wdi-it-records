"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { saveHandover, type SaveState } from "./actions";

export type PickAsset = { id: number; asset_tag: string; label: string; status: string; user_name: string | null; position: string | null; department: string | null; computer: boolean };

type Props = { assets: PickAsset[]; initialAsset: number | null; users: string[]; positions: string[]; depts: string[]; conditions: string[]; today: string };

const input = "input";

export default function HandoverForm({ assets, initialAsset, users, positions, depts, conditions, today }: Props) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveHandover, {});
  const [assetId, setAssetId] = useState<number | null>(initialAsset);
  const asset = assets.find((a) => a.id === assetId) ?? null;
  // The asset's state decides the only valid action: issued -> Return, otherwise -> Issue.
  const act = asset ? (asset.status === "In Use" ? "Return" : "Issue") : null;

  return (
    <form action={action} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm">ทรัพย์สิน <span className="text-red-600">*</span></span>
        <select name="asset_id" value={assetId ?? ""} onChange={(e) => setAssetId(Number(e.target.value) || null)} required className={input}>
          <option value="">— เลือก —</option>
          {assets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.asset_tag} · {a.label} · {a.status === "In Use" ? `อยู่กับ ${a.user_name ?? "?"}` : a.status === "Repair" ? "ซ่อม" : "สต็อก"}
            </option>
          ))}
        </select>
      </label>

      {asset && act && (
        // key: re-mount defaults when the chosen asset changes
        <div key={asset.id} className="space-y-4">
          <input type="hidden" name="action" value={act} />
          <p className={`rounded-md px-3 py-2 text-sm ${act === "Issue" ? "bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100" : "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100"}`}>
            {act === "Issue"
              ? <>บันทึก <b>ส่งมอบ</b> {asset.asset_tag} — สถานะจะเปลี่ยนเป็น “ใช้งาน” และผู้ใช้เป็นชื่อที่กรอก</>
              : <>บันทึก <b>รับคืน</b> {asset.asset_tag} จาก {asset.user_name ?? "?"} — สถานะจะเปลี่ยนเป็น “สต็อก” (หรือ “ซ่อม” ถ้าสภาพ Damaged / Missing Parts)</>}
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm">วันที่ <span className="text-red-600">*</span></span>
              <input type="date" name="h_date" defaultValue={today} max={today} required className={input} />
            </label>
            <label className="block space-y-1">
              <span className="text-sm">{act === "Issue" ? "ผู้รับ" : "ผู้คืน"} <span className="text-red-600">*</span></span>
              <input name="user_name" list="ho-users" defaultValue={act === "Return" ? asset.user_name ?? "" : ""} required autoComplete="off" className={input} />
              <datalist id="ho-users">{users.map((u) => <option key={u} value={u} />)}</datalist>
            </label>
            {asset.computer && (
              <label className="block space-y-1">
                <span className="text-sm">ตำแหน่ง</span>
                <input name="position" list="ho-positions" defaultValue={act === "Return" ? asset.position ?? "" : ""} autoComplete="off" className={input} />
                <datalist id="ho-positions">{positions.map((p) => <option key={p} value={p} />)}</datalist>
              </label>
            )}
            <label className="block space-y-1">
              <span className="text-sm">แผนก</span>
              <select name="dept" defaultValue={asset.department ?? ""} className={input}>
                <option value=""></option>
                {depts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-sm">สภาพ</span>
              <select name="condition" defaultValue="Good" className={input}>
                {conditions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-sm">เลขใบรับ-คืน</span>
              <input name="form_ref" className={input} />
            </label>
            <label className="block space-y-1 sm:col-span-2">
              <span className="text-sm">หมายเหตุ</span>
              <textarea name="remark" rows={2} className={input} />
            </label>
          </div>
        </div>
      )}

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={pending || !asset} className="btn btn-primary px-5 py-2.5">
          {pending ? "กำลังบันทึก…" : act === "Return" ? "บันทึกรับคืน" : "บันทึกส่งมอบ"}
        </button>
        <Link href="/handover" className="px-2 py-2.5 text-sm opacity-70">ยกเลิก</Link>
      </div>
    </form>
  );
}
