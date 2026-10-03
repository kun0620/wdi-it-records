import { getSession } from "@/lib/supabase/server";
import { todayISO } from "@/lib/dates";
import GenerateButton from "./GenerateButton";

type FileItem = { path: string; name: string; size: number; updated: string | null };

const card = "card p-4 sm:p-5";

function FileList({ files, empty }: { files: FileItem[]; empty: string }) {
  if (files.length === 0) return <p className="text-sm opacity-60">{empty}</p>;
  return (
    <ul className="divide-y divide-[var(--line)]">
      {files.map((f) => (
        <li key={f.path} className="flex items-center justify-between gap-3 py-2 text-sm">
          <span className="min-w-0 truncate">{f.name}</span>
          <span className="flex shrink-0 items-center gap-3">
            <span className="text-xs opacity-50">
              {(f.size / 1024).toFixed(0)} KB
              {f.updated && ` · ${new Date(f.updated).toLocaleString("en-GB", { timeZone: "Asia/Bangkok", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}`}
            </span>
            <a href={`/exports/download?path=${encodeURIComponent(f.path)}`} className="btn px-2.5 py-1">
              ดาวน์โหลด
            </a>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function ExportsPage() {
  const { supabase, role } = await getSession();
  const [y, m] = todayISO().split("-").map(Number);
  const bucket = supabase.storage.from("it-exports");

  const list = async (prefix: string): Promise<FileItem[]> => {
    const { data } = await bucket.list(prefix, { limit: 100, sortBy: { column: "name", order: "desc" } });
    return (data ?? [])
      .filter((f) => f.name.endsWith(".xlsx"))
      .map((f) => ({ path: `${prefix}/${f.name}`, name: f.name, size: f.metadata?.size ?? 0, updated: f.updated_at }));
  };

  // Daily files: this month and the previous two. Monthly files: this year and last year.
  const months = [0, 1, 2].map((i) => {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    return `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
  const [daily, monthly] = await Promise.all([
    Promise.all(months.map((p) => list(`${p}/daily`))).then((a) => a.flat()),
    Promise.all([y, y - 1].map((yy) => list(`${yy}/monthly`))).then((a) => a.flat()),
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 px-3 py-4 sm:px-6 sm:py-6">
      <h1 className="text-xl font-bold sm:text-2xl">ไฟล์ Export <span className="text-sm font-normal opacity-60">.xlsx</span></h1>
      <p className="text-sm opacity-70">
        ไฟล์ Excel หน้าตาเหมือนชีตเดิม: Summary · Service_Log · Daily_Check · Weekly_Check · Maintenance · Handover · Doc_List · Assets · Audit_Log
      </p>
      {role === "editor" && <GenerateButton />}

      <section className={card}>
        <h2 className="mb-1 font-semibold">รายเดือน</h2>
        <p className="mb-2 text-xs opacity-60">อัปเดตทุกครั้งที่สร้างไฟล์ในเดือนนั้น — หลังสิ้นเดือนคือภาพ ณ สิ้นเดือน</p>
        <FileList files={monthly} empty="ยังไม่มีไฟล์รายเดือน" />
      </section>

      <section className={card}>
        <h2 className="mb-2 font-semibold">รายวัน <span className="text-xs font-normal opacity-60">(3 เดือนล่าสุด)</span></h2>
        <FileList files={daily} empty="ยังไม่มีไฟล์รายวัน" />
      </section>
    </main>
  );
}
