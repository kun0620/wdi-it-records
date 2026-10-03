import Link from "next/link";
import { notFound } from "next/navigation";
import { GitBranchPlus } from "lucide-react";
import { getSession } from "@/lib/supabase/server";
import { getLists } from "@/lib/lists";
import { todayISO } from "@/lib/dates";
import DocForm from "../DocForm";
import type { DocRow } from "../shared";

export default async function EditDocPage(props: PageProps<"/documents/[id]">) {
  const { id } = await props.params;
  if (!/^\d+$/.test(id)) notFound();
  const { supabase, role } = await getSession();
  const [{ data }, lists] = await Promise.all([
    supabase.from("documents").select("*").eq("id", Number(id)).maybeSingle(),
    getLists(supabase, ["user"]),
  ]);
  if (!data) notFound();
  const rec = data as DocRow;
  const { data: revs } = await supabase.from("documents").select("rev, status").eq("doc_no", rec.doc_no).neq("id", rec.id);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-3 py-3 sm:px-5 sm:py-5">
      <div className="row flex-wrap px-1" style={{ gap: 8 }}>
        <h2 className="h2 mono flex-1">{rec.doc_no} <span className="muted small font-normal">Rev. {rec.rev}</span></h2>
        {role === "editor" && rec.status !== "Obsolete" && (
          <Link href={`/documents/new?from=${rec.id}`} className="btn btn-secondary btn-sm"><GitBranchPlus className="size-4" />สร้าง Rev. ใหม่</Link>
        )}
      </div>
      <DocForm key={rec.updated_at} rec={rec} others={revs ?? []} users={lists.user.map((u) => u.value)} canEdit={role === "editor"} today={todayISO()} />
    </main>
  );
}
