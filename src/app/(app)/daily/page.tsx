import Link from "next/link";
import { getSession } from "@/lib/supabase/server";
import { isISODate, thDate, todayISO } from "@/lib/dates";
import { CHECKS, type DailyRow } from "./checks";
import DailyForm from "./DailyForm";
import { CHECK_SYSTEM } from "../service/shared";

// NG found -> open a prefilled Incident in Service Log (the v1 rule: "ถ้า NG ให้เปิด Service_Log ประเภท Incident").
function IncidentLink({ row }: { row: DailyRow }) {
  const ng = CHECKS.filter((c) => row[c.k] === "NG");
  const params = new URLSearchParams({
    type: "Incident",
    system: CHECK_SYSTEM[ng[0].k],
    priority: "P2",
    detail: `Daily Check ${thDate(row.check_date)} NG: ${ng.map((c) => c.th).join(", ")}${row.remark ? ` — ${row.remark}` : ""}`,
  });
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-900 dark:bg-red-950 dark:text-red-100">
      <span>พบ NG {ng.length} รายการ: {ng.map((c) => c.th).join(", ")}</span>
      <Link href={`/service/new?${params}`} className="font-medium underline underline-offset-2">เปิดงาน Incident →</Link>
    </div>
  );
}

export default async function DailyPage(props: PageProps<"/daily">) {
  const sp = await props.searchParams;
  const today = todayISO();
  const date = isISODate(sp.date) && sp.date <= today ? sp.date : today;

  const { supabase, role } = await getSession();
  const [{ data: recent }, { data: users }] = await Promise.all([
    supabase.from("daily_check").select("*").order("check_date", { ascending: false }).limit(14),
    supabase.from("list_items").select("value").eq("list_key", "user").eq("active", true).order("sort"),
  ]);
  const rows = (recent ?? []) as DailyRow[];
  let existing = rows.find((r) => r.check_date === date) ?? null;
  if (!existing) {
    const { data } = await supabase.from("daily_check").select("*").eq("check_date", date).maybeSingle();
    existing = (data as DailyRow | null) ?? null;
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-3 py-4 sm:px-6 sm:py-6">
      <h1 className="text-xl font-bold sm:text-2xl">เช็คประจำวัน <span className="text-sm font-normal opacity-60">Daily Check</span></h1>

      {existing && existing.ng_count > 0 && role === "editor" && (
        <IncidentLink row={existing} />
      )}

      <DailyForm
        key={date}
        date={date}
        today={today}
        existing={existing}
        defaultChecker={existing?.checker ?? rows[0]?.checker ?? ""}
        users={(users ?? []).map((u) => u.value)}
        canEdit={role === "editor"}
      />

      <section className="card p-4 sm:p-5">
        <h2 className="mb-3 font-semibold">ย้อนหลัง 14 วันที่บันทึก</h2>
        {rows.length === 0 ? (
          <p className="text-sm opacity-60">ยังไม่มีข้อมูล</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs opacity-60">
                <tr>
                  <th className="py-1 pr-2">วันที่</th>
                  {CHECKS.map((c) => <th key={c.k} className="hidden px-1 sm:table-cell">{c.th.split(" ")[0]}</th>)}
                  <th className="px-1">ครบ</th><th className="px-1">NG</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.check_date} className="border-t border-[var(--line)]">
                    <td className="py-1.5 pr-2">
                      <Link href={`/daily?date=${r.check_date}`} className="underline-offset-2 hover:underline">{thDate(r.check_date)}</Link>
                    </td>
                    {CHECKS.map((c) => (
                      <td key={c.k} className={`hidden px-1 sm:table-cell ${r[c.k] === "NG" ? "font-semibold text-red-600" : ""}`}>{r[c.k] ?? "–"}</td>
                    ))}
                    <td className="px-1">{r.complete === 1 ? <span className="text-green-600">✓</span> : <span className="text-amber-600">ไม่ครบ</span>}</td>
                    <td className="px-1">{r.ng_count || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
