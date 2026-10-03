import { notFound } from "next/navigation";
import { getSession } from "@/lib/supabase/server";
import { getLists } from "@/lib/lists";
import { thDate, todayISO } from "@/lib/dates";
import MaintForm from "../MaintForm";
import type { MaintRow, MaintType } from "../shared";

export default async function EditMaintPage(props: PageProps<"/maintenance/[id]">) {
  const { id } = await props.params;
  if (!/^\d+$/.test(id)) notFound();
  const { supabase, role } = await getSession();
  const [{ data }, { data: types }, lists] = await Promise.all([
    supabase.from("maintenance").select("*").eq("id", Number(id)).maybeSingle(),
    supabase.from("maint_types").select("name, every_months").order("sort"),
    getLists(supabase, ["user"]),
  ]);
  if (!data) notFound();
  const rec = data as MaintRow;
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-3 py-3 sm:px-5 sm:py-5">
      <h2 className="h2 px-1">{rec.type} <span className="muted small font-normal">{thDate(rec.done_date)}</span></h2>
      <MaintForm key={rec.updated_at} rec={rec} types={(types ?? []) as MaintType[]} users={lists.user.map((u) => u.value)}
        canEdit={role === "editor"} today={todayISO()} />
    </main>
  );
}
