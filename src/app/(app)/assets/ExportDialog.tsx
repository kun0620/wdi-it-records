"use client";

import { useEffect, useState } from "react";
import { Check, FileSpreadsheet, X } from "lucide-react";
import { KIND_ICON } from "./AssetIcon";
import { ASSET_STATUSES, PREFIXES, STATUS_TONE } from "./shared";

const TYPE_EN: Record<string, string> = { PC: "Desktop", NB: "Laptop", NW: "Network", CA: "Camera/NVR", PR: "Printer", AC: "Face scan", OT: "Other" };

type Props = {
  assets: { asset_tag: string | null; status: string }[];   // every asset, for the live counts
  today: string;
  q: string;                                                  // current search, passed through to the export
  initialType: string;
  initialStatus: string;
};

// Export Excel dialog (design canvas "Export Excel dialog"): pick types and statuses, see the file name
// and how many rows it will hold, then download. Nothing picked in a group = all of that group.
export default function ExportDialog({ assets, today, q, initialType, initialStatus }: Props) {
  const [open, setOpen] = useState(false);
  const [types, setTypes] = useState<string[]>(initialType ? [initialType] : []);
  const [statuses, setStatuses] = useState<string[]>(initialStatus ? [initialStatus] : []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);

  const prefix = (tag: string | null) => tag?.match(/^WDI-([A-Z]+)-/)?.[1] ?? "";
  const typeN = (p: string) => assets.filter((a) => prefix(a.asset_tag) === p).length;
  const statusN = (s: string) => assets.filter((a) => a.status === s && (!types.length || types.includes(prefix(a.asset_tag)))).length;
  const count = assets.filter((a) => (!types.length || types.includes(prefix(a.asset_tag))) && (!statuses.length || statuses.includes(a.status))).length;
  const file = `WDI-Assets_${today}${types.length ? `_${types.join("-")}` : ""}${statuses.length ? `_${statuses.map((s) => s.replace(/\s+/g, "")).join("-")}` : ""}.xlsx`;
  const toggle = (list: string[], set: (v: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-secondary w-full max-sm:!h-9 max-sm:!px-3 max-sm:!text-[13px]">
        <FileSpreadsheet className="size-4" />Export Excel
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="scrim" onClick={() => setOpen(false)} />
          <form
            action="/assets/export" method="get" onSubmit={() => setTimeout(() => setOpen(false), 300)}
            className="sheet left-1/2 top-1/2 max-h-[92dvh] w-[min(600px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto"
            style={{ borderRadius: 20, padding: 24 }} role="dialog" aria-modal="true" aria-labelledby="export-title"
          >
            <div className="row" style={{ gap: 12, marginBottom: 18 }}>
              <span className="kchip" style={{ background: "var(--ok-bg)", color: "var(--ok-fg)" }}><FileSpreadsheet className="size-[18px]" /></span>
              <div className="min-w-0 flex-1">
                <h2 id="export-title" className="h2">Export Excel</h2>
                <div className="small muted">เลือกประเภทและสถานะที่ต้องการ · ไม่เลือก = ทั้งหมด</div>
              </div>
              <button type="button" className="icon-btn plain" aria-label="ปิด" onClick={() => setOpen(false)}><X className="size-5" /></button>
            </div>

            <div className="flabel" style={{ marginBottom: 8 }}>
              ประเภท <span className="muted" style={{ fontWeight: 500 }}>· {types.length ? `เลือก ${types.length} จาก ${PREFIXES.length}` : "ทั้งหมด"}</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" style={{ marginBottom: 18 }}>
              {PREFIXES.map(({ p }) => {
                const on = types.includes(p);
                const Icon = KIND_ICON[p];
                return (
                  <label key={p} className="row cursor-pointer" style={{
                    gap: 10, padding: "10px 12px", borderRadius: 10,
                    border: `1px solid ${on ? "var(--accent)" : "var(--line)"}`, background: on ? "var(--accentSoft)" : "var(--card)",
                  }}>
                    <input type="checkbox" name="type" value={p} checked={on} onChange={() => toggle(types, setTypes, p)} className="sr-only" />
                    <span className={`check ${on ? "on" : ""}`}>{on && <Check className="size-3" strokeWidth={3} />}</span>
                    <Icon className="size-4 text-[var(--ink2)]" />
                    <span className="flex-1 small" style={{ fontWeight: 600 }}>{p} {TYPE_EN[p]}</span>
                    <span className="small muted">{typeN(p)}</span>
                  </label>
                );
              })}
            </div>

            <div className="flabel" style={{ marginBottom: 8 }}>
              สถานะ <span className="muted" style={{ fontWeight: 500 }}>· {statuses.length ? `เลือก ${statuses.length} จาก ${ASSET_STATUSES.length}` : "ทั้งหมด"}</span>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
              {ASSET_STATUSES.map((s) => {
                const on = statuses.includes(s.v);
                return (
                  <label key={s.v} className="row cursor-pointer" style={{
                    gap: 8, padding: "6px 10px 6px 8px", borderRadius: 999, border: `1px solid ${on ? "var(--accent)" : "var(--line)"}`,
                  }}>
                    <input type="checkbox" name="status" value={s.v} checked={on} onChange={() => toggle(statuses, setStatuses, s.v)} className="sr-only" />
                    <span className={`check ${on ? "on" : ""}`}>{on && <Check className="size-3" strokeWidth={3} />}</span>
                    <span className={`pill sm ${STATUS_TONE[s.v]}`}>{s.th}</span>
                    <span className="small muted">{statusN(s.v)}</span>
                  </label>
                );
              })}
            </div>

            {q && <input type="hidden" name="q" value={q} />}
            <div className="row" style={{ gap: 10, padding: "12px 14px", borderRadius: 12, background: "var(--card2)", marginBottom: q ? 8 : 20 }}>
              <FileSpreadsheet className="size-4 shrink-0 text-[var(--ok-fg)]" />
              <span className="mono small min-w-0 flex-1 truncate">{file}</span>
              <span className="small whitespace-nowrap" style={{ fontWeight: 700 }}>{count} รายการ</span>
            </div>
            {q && <p className="ihint" style={{ marginBottom: 20 }}>กรองด้วยคำค้นหา “{q}” ด้วย — จำนวนจริงอาจน้อยกว่านี้</p>}

            <div className="row" style={{ gap: 10, justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>ยกเลิก</button>
              <button className="btn btn-primary" disabled={count === 0}><FileSpreadsheet className="size-4" />Export {count} รายการ</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
