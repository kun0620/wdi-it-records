import { notFound } from "next/navigation";
import { getSession } from "@/lib/supabase/server";
import { getLists } from "@/lib/lists";
import { nowHHMM, todayISO } from "@/lib/dates";
import ServiceForm from "../ServiceForm";
import { SERVICE_LISTS, type ServiceRow } from "../shared";

export default async function EditServicePage(props: PageProps<"/service/[id]">) {
  const { id } = await props.params;
  if (!/^\d+$/.test(id)) notFound();

  const { supabase, role } = await getSession();
  const [{ data }, lists] = await Promise.all([
    supabase.from("service_log").select("*").eq("id", Number(id)).maybeSingle(),
    getLists(supabase, SERVICE_LISTS),
  ]);
  if (!data) notFound();
  const rec = data as ServiceRow;

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
      <h1 className="text-lg font-semibold">{rec.req_no}</h1>
      <ServiceForm key={rec.updated_at} rec={rec} lists={lists} canEdit={role === "editor"} today={todayISO()} now={nowHHMM()} />
    </main>
  );
}
