import { getSession } from "@/lib/supabase/server";
import { getLists } from "@/lib/lists";
import { todayISO } from "@/lib/dates";
import DocForm from "../DocForm";
import { nextRev, revCmp, type DocRow } from "../shared";

// ?from=<id>: start the next revision of that document (same number and titles, Rev. + 1, Draft).
export default async function NewDocPage(props: PageProps<"/documents/new">) {
  const sp = await props.searchParams;
  const fromId = Number(sp.from) || null;
  const { supabase, role } = await getSession();
  const lists = await getLists(supabase, ["user"]);

  let rec: Partial<DocRow> = { rev: "00", status: "Draft" };
  let others: { rev: string; status: string }[] = [];
  if (fromId) {
    const { data: src } = await supabase.from("documents").select("*").eq("id", fromId).maybeSingle();
    if (src) {
      const { data: revs } = await supabase.from("documents").select("rev, status").eq("doc_no", src.doc_no);
      others = revs ?? [];
      const top = others.map((r) => r.rev).sort(revCmp).at(-1) ?? src.rev;
      rec = { doc_no: src.doc_no, rev: nextRev(top), status: "Draft", title_en: src.title_en, title_th: src.title_th, title_cn: src.title_cn,
        prepared_by: src.prepared_by, approved_by: src.approved_by };
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-3 py-3 sm:px-5 sm:py-5">
      <h2 className="h2 px-1">{fromId && rec.doc_no ? `${rec.doc_no} · Rev. ใหม่` : "เพิ่มเอกสาร"}</h2>
      <DocForm rec={rec} others={others} users={lists.user.map((u) => u.value)} canEdit={role === "editor"} today={todayISO()} />
    </main>
  );
}
