import Link from "next/link";
import { getSession } from "@/lib/supabase/server";
import { thDate } from "@/lib/dates";

type Row = { id: number; h_date: string; action: string; asset_id: number; asset_key: string; model: string | null; category: string | null;
  user_name: string; dept: string | null; condition: string | null; form_ref: string | null; remark: string | null };

export default async function HandoverListPage() {
  const { supabase, role } = await getSession();
  const { data, error } = await supabase.from("handover_v").select("*").order("h_date", { ascending: false }).order("id", { ascending: false }).limit(300);
  const rows = (data ?? []) as Row[];

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">รับ-คืนอุปกรณ์ <span className="text-sm font-normal opacity-60">Handover</span></h1>
        {role === "editor" && <Link href="/handover/new" className="rounded-md bg-foreground px-4 py-2 text-sm text-background">+ บันทึก</Link>}
      </div>
      {error && <p className="text-sm text-red-600">{error.message}</p>}
      <ul className="divide-y divide-black/5 rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/15">
        {rows.length === 0 && <li className="px-4 py-6 text-center text-sm opacity-60">ยังไม่มีรายการ</li>}
        {rows.map((r) => (
          <li key={r.id}>
            <Link href={`/assets/${r.asset_id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-black/[.03] dark:hover:bg-white/[.04]">
              <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs ${r.action === "Issue" ? "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"}`}>
                {r.action === "Issue" ? "ส่งมอบ" : "รับคืน"}
              </span>
              <div className="min-w-0 flex-1">
                <div><span className="font-mono">{r.asset_key}</span> <span className="text-sm opacity-70">{r.model ?? r.category}</span></div>
                <p className="truncate text-xs opacity-60">
                  {[thDate(r.h_date), r.user_name, r.dept, r.condition, r.form_ref && `ใบ ${r.form_ref}`, r.remark].filter(Boolean).join(" · ")}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
