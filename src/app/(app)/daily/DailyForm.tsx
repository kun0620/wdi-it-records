"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { thDate } from "@/lib/dates";
import { CHECKS, RESULTS, type CheckKey, type CheckResult, type DailyRow } from "./checks";
import { saveDaily, type SaveState } from "./actions";

const TONE: Record<CheckResult, string> = {
  OK: "bg-green-600 text-white border-green-600",
  NG: "bg-red-600 text-white border-red-600",
  "N/A": "bg-gray-500 text-white border-gray-500",
};

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
  const [confirmIncomplete, setConfirmIncomplete] = useState(false);
  const missing = CHECKS.filter((c) => !results[c.k]).length;

  return (
    <form
      action={action}
      onSubmit={(e) => {
        // Saving with unanswered checks is allowed (day counts as incomplete) but must be confirmed.
        if (missing > 0 && !confirmIncomplete) {
          e.preventDefault();
          setConfirmIncomplete(true);
        }
      }}
      className="space-y-4"
    >
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="date" name="check_date" value={date} max={today}
          onChange={(e) => e.target.value && router.push(`/daily?date=${e.target.value}`)}
          className="input w-auto"
        />
        {canEdit && (
          <button type="button" onClick={() => { setResults(Object.fromEntries(CHECKS.map((c) => [c.k, "OK"]))); setConfirmIncomplete(false); }}
            className="btn btn-secondary px-3">
            ทุกข้อ OK
          </button>
        )}
      </div>

      {existing && (
        <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-100">
          มีบันทึกของวันที่ {thDate(date)} แล้ว — บันทึกอีกครั้งจะแก้ไขรายการเดิม (ประวัติการแก้ไขถูกเก็บไว้)
        </p>
      )}

      <div className="card divide-y divide-[var(--line)] overflow-hidden">
        {CHECKS.map((c) => (
          <div key={c.k} className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <div className="font-medium">{c.th}</div>
              <div className="text-xs opacity-60">{c.hint}</div>
            </div>
            <input type="hidden" name={c.k} value={results[c.k] ?? ""} />
            <div className="flex shrink-0 gap-1.5" role="radiogroup" aria-label={c.th}>
              {RESULTS.map((v) => {
                const on = results[c.k] === v;
                return (
                  <button
                    key={v} type="button" role="radio" aria-checked={on} disabled={!canEdit}
                    onClick={() => { setResults((r) => ({ ...r, [c.k]: v })); setConfirmIncomplete(false); }}
                    className={`min-w-12 rounded-md border px-2.5 py-2 text-sm ${on ? TONE[v] : "border-[var(--line-strong)] bg-surface"}`}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <label className="block space-y-1">
        <span className="text-sm">รายละเอียด NG / หมายเหตุ</span>
        <textarea name="remark" defaultValue={existing?.remark ?? ""} readOnly={!canEdit} rows={3}
          className="input" />
      </label>

      <div className="flex flex-wrap items-end gap-3">
        <label className="block flex-1 space-y-1">
          <span className="text-sm">ผู้ตรวจ *</span>
          <input name="checker" list="daily-users" defaultValue={defaultChecker} readOnly={!canEdit} required
            className="input" />
          <datalist id="daily-users">{users.map((u) => <option key={u} value={u} />)}</datalist>
        </label>
        {canEdit && (
          <button type="submit" disabled={pending}
            className="btn btn-primary px-5 py-2.5">
            {pending ? "กำลังบันทึก…" : confirmIncomplete ? `ยืนยันบันทึก (ขาด ${missing} รายการ)` : "บันทึก Daily Check"}
          </button>
        )}
      </div>

      {confirmIncomplete && missing > 0 && (
        <p className="text-sm text-amber-700">ยังไม่ได้เลือก {missing} รายการ — วันนี้จะนับว่า &quot;ไม่ครบ&quot; กดอีกครั้งเพื่อยืนยัน</p>
      )}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-green-700">{state.ok}</p>}
    </form>
  );
}
