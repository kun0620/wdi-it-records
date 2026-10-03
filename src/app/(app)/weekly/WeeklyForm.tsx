"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, DatabaseBackup, HardDrive, ShieldAlert } from "lucide-react";
import { shortThaiDate } from "@/lib/dates";
import { saveWeekly, type SaveState } from "./actions";
import { BACKUP, LOW_DISK, type WeeklyRow } from "./shared";

type Props = { week: string; weekEnd: string; maxWeek: string; existing: WeeklyRow | null; defaultChecker: string; users: string[]; canEdit: boolean };

function Disk({ name, label, value, onChange, ro }: { name: string; label: string; value: string; onChange: (v: string) => void; ro: boolean }) {
  const n = Number(value);
  const low = value !== "" && n < LOW_DISK;
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <div className="iwrap">
        <input id={name} name={name} inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} readOnly={ro}
          className={`input pr mono ${low ? "err" : ""}`} placeholder="เช่น 35" />
        <span className="ic suffix small muted">%</span>
      </div>
      <div className="minibar"><i style={{ width: `${Math.min(100, Math.max(0, n || 0))}%`, background: low ? "var(--bad)" : undefined }} /></div>
      {low && <div className="ierr">ต่ำกว่า {LOW_DISK}% — วางแผนเพิ่มพื้นที่</div>}
    </div>
  );
}

export default function WeeklyForm({ week, weekEnd, maxWeek, existing, defaultChecker, users, canEdit }: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState<SaveState, FormData>(saveWeekly, {});
  const [backup, setBackup] = useState(existing?.backup ?? "");
  const [srv, setSrv] = useState(existing?.disk_srv?.toString() ?? "");
  const [nvr, setNvr] = useState(existing?.disk_nvr?.toString() ?? "");
  const ro = !canEdit;
  const num = (name: keyof WeeklyRow, label: string, hint: string) => (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} type="number" min={0} step={1} inputMode="numeric" defaultValue={(existing?.[name] as number | null) ?? ""} readOnly={ro} className="input mono" />
      <div className="ihint">{hint}</div>
    </div>
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="week_start" value={week} />

      <section className="card !p-4">
        <div className="row flex-wrap" style={{ gap: 12 }}>
          <span className="kchip"><CalendarRange className="size-[18px]" /></span>
          <div className="min-w-0 flex-1">
            <div className="small muted">สัปดาห์ (จันทร์–อาทิตย์)</div>
            <h2 className="h2">{shortThaiDate(week)} – {shortThaiDate(weekEnd)}</h2>
          </div>
          <input type="week" aria-label="เลือกสัปดาห์" className="input !h-9 text-sm max-sm:w-full sm:w-auto"
            value={isoWeekValue(week)} max={isoWeekValue(maxWeek)}
            onChange={(e) => { const m = weekToMonday(e.target.value); if (m) router.push(`/weekly?week=${m}`); }} />
        </div>
        {existing && <p className="small muted mt-2">มีบันทึกของสัปดาห์นี้แล้ว — บันทึกอีกครั้งจะแก้รายการเดิม (ประวัติถูกเก็บไว้)</p>}
      </section>

      <section className="card !p-4">
        <div className="section-t"><DatabaseBackup className="ic size-4" />สถานะ Backup<span className="req">*</span></div>
        <div className="grid gap-2 sm:grid-cols-3">
          {BACKUP.map((b) => (
            <label key={b.v} className={`radio-card ${backup === b.v ? "on" : ""}`}>
              <input type="radio" name="backup" value={b.v} checked={backup === b.v} onChange={() => setBackup(b.v)} disabled={ro} className="sr-only" />
              <span className="rd" />
              <span className="min-w-0">
                <span className={`pill sm ${b.tone}`}>{b.th}</span>
                <span className="small muted mt-1 block">{b.hint}</span>
              </span>
            </label>
          ))}
        </div>
        {backup && backup !== "Success" && (
          <div className="field mt-3">
            <label htmlFor="backup_note">งานที่ fail / การรันซ้ำ<span className="req">*</span></label>
            <textarea id="backup_note" name="backup_note" rows={2} defaultValue={existing?.backup_note ?? ""} readOnly={ro} className="input" placeholder="เช่น Job FileServer-Daily fail 2 ต.ค. รันซ้ำ 3 ต.ค. ผ่าน" />
          </div>
        )}
      </section>

      <section className="card !p-4">
        <div className="section-t"><HardDrive className="ic size-4" />พื้นที่ดิสก์ว่าง</div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Disk name="disk_srv" label="Server" value={srv} onChange={setSrv} ro={ro} />
          <Disk name="disk_nvr" label="NVR (กล้อง)" value={nvr} onChange={setNvr} ro={ro} />
        </div>
      </section>

      <section className="card !p-4">
        <div className="section-t"><ShieldAlert className="ic size-4" />บัญชีและแพตช์</div>
        <div className="grid gap-4 sm:grid-cols-3">
          {num("ad_locked", "AD ถูกล็อก", "จำนวนบัญชี")}
          {num("ad_inactive", "AD ไม่ใช้ > 90 วัน", "จำนวนบัญชี")}
          {num("unpatched", "เครื่องยังไม่ลงแพตช์", "จำนวนเครื่อง")}
        </div>
      </section>

      <section className="card !p-4">
        <div className="field">
          <label htmlFor="remark">การดำเนินการ / หมายเหตุ</label>
          <textarea id="remark" name="remark" rows={3} defaultValue={existing?.remark ?? ""} readOnly={ro} className="input" />
        </div>
        <div className="field mt-3">
          <label htmlFor="checker">ผู้ตรวจ<span className="req">*</span></label>
          <input id="checker" name="checker" list="weekly-users" defaultValue={defaultChecker} readOnly={ro} required className="input" />
          <datalist id="weekly-users">{users.map((u) => <option key={u} value={u} />)}</datalist>
        </div>
      </section>

      {state.error && <p className="ierr">{state.error}</p>}
      {state.ok && <p className="banner info small">{state.ok}</p>}

      {canEdit && (
        <div className="sticky-foot -mx-3 rounded-t-2xl sm:mx-0 sm:rounded-2xl">
          <button type="submit" disabled={pending || !backup} className="btn btn-primary btn-lg btn-block">
            {pending ? "กำลังบันทึก…" : backup ? "บันทึก Weekly Check" : "เลือกสถานะ Backup ก่อนบันทึก"}
          </button>
        </div>
      )}
    </form>
  );
}

// <input type="week"> uses "2026-W40"
function isoWeekValue(monday: string) {
  const d = new Date(`${monday}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 3);                       // Thursday decides the ISO year
  const y = d.getUTCFullYear();
  const w = Math.ceil(((d.getTime() - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
  return `${y}-W${String(w).padStart(2, "0")}`;
}
function weekToMonday(v: string) {
  const m = v.match(/^(\d{4})-W(\d{2})$/);
  if (!m) return null;
  const jan4 = new Date(Date.UTC(+m[1], 0, 4));
  const mon1 = new Date(jan4);
  mon1.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7));
  mon1.setUTCDate(mon1.getUTCDate() + (+m[2] - 1) * 7);
  return mon1.toISOString().slice(0, 10);
}
