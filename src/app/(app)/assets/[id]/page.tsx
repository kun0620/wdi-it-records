import { notFound } from "next/navigation";
import { getSession } from "@/lib/supabase/server";
import { getLists } from "@/lib/lists";
import { todayISO } from "@/lib/dates";
import AssetForm from "../AssetForm";
import { statusOf, type AssetRow } from "../shared";

type Audit = { id: number; at: string; actor: string | null; op: string; changed: Record<string, [unknown, unknown]> | null };

const HIDDEN = new Set(["updated_at", "updated_by", "created_at", "created_by", "raw", "imported_at"]);
const fmt = (v: unknown) => (v === null || v === undefined || v === "" ? "∅" : String(v));

export default async function AssetPage(props: PageProps<"/assets/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  if (!/^\d+$/.test(id)) notFound();

  const { supabase, role } = await getSession();
  const [{ data }, { data: history }, lists] = await Promise.all([
    supabase.from("assets").select("*").eq("id", Number(id)).maybeSingle(),
    supabase.from("audit_log").select("id, at, actor, op, changed")
      .eq("table_name", "assets").eq("row_id", Number(id)).order("id", { ascending: false }).limit(50),
    getLists(supabase, ["user", "dept"]),
  ]);
  if (!data) notFound();
  const rec = data as AssetRow;
  const st = statusOf(rec.status);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-lg font-semibold">{rec.asset_tag ?? "ยังไม่มีแท็ก"}</h1>
        <span className={`rounded-full px-2 py-0.5 text-xs ${st?.tone ?? ""}`}>{st?.th ?? rec.status}</span>
        {rec.source_sheet && <span className="text-xs opacity-50">นำเข้าจากชีต {rec.source_sheet}</span>}
      </div>
      {sp.saved && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-900 dark:bg-green-950 dark:text-green-100">บันทึกแล้ว</p>
      )}

      <AssetForm key={rec.updated_at} rec={rec} users={lists.user.map((u) => u.value)} depts={lists.dept.map((d) => d.value)}
        canEdit={role === "editor"} today={todayISO()} />

      <section className="rounded-xl border border-black/10 p-4 dark:border-white/15">
        <h2 className="mb-2 font-medium">ประวัติการแก้ไข</h2>
        <ul className="space-y-2 text-sm">
          {(history as Audit[] | null ?? []).map((h) => {
            const changes = Object.entries(h.changed ?? {}).filter(([k]) => !HIDDEN.has(k));
            if (h.op === "UPDATE" && changes.length === 0) return null;
            return (
              <li key={h.id} className="border-t border-black/5 pt-2 first:border-0 first:pt-0 dark:border-white/10">
                <div className="text-xs opacity-60">
                  {new Date(h.at).toLocaleString("en-GB", { timeZone: "Asia/Bangkok", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  {" · "}{h.actor || "ระบบ"}{" · "}{h.op === "INSERT" ? "เพิ่มรายการ" : "แก้ไข"}
                </div>
                {changes.map(([k, [a, b]]) => (
                  <div key={k}><span className="opacity-60">{k}:</span> {fmt(a)} → <b>{fmt(b)}</b></div>
                ))}
              </li>
            );
          })}
          {!history?.length && <li className="opacity-60">ยังไม่มีประวัติ</li>}
        </ul>
      </section>
    </main>
  );
}
