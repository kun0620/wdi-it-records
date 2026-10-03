import { getSession } from "@/lib/supabase/server";
import { getLists } from "@/lib/lists";
import { todayISO } from "@/lib/dates";
import MaintForm from "../MaintForm";
import type { MaintType } from "../shared";

export default async function NewMaintPage(props: PageProps<"/maintenance/new">) {
  const sp = await props.searchParams;
  const { supabase, role } = await getSession();
  const [{ data: types }, lists, { data: last }] = await Promise.all([
    supabase.from("maint_types").select("name, every_months").order("sort"),
    getLists(supabase, ["user"]),
    supabase.from("maintenance").select("done_by").order("id", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const type = typeof sp.type === "string" && (types ?? []).some((t) => t.name === sp.type) ? sp.type : undefined;
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-3 py-3 sm:px-5 sm:py-5">
      <h2 className="h2 px-1">บันทึกงานบำรุงรักษา</h2>
      <MaintForm rec={{ type, result: "Pass", done_by: last?.done_by ?? "" }} types={(types ?? []) as MaintType[]}
        users={lists.user.map((u) => u.value)} canEdit={role === "editor"} today={todayISO()} />
    </main>
  );
}
