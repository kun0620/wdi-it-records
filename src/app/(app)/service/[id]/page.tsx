import { notFound } from "next/navigation";
import { getSession } from "@/lib/supabase/server";
import { getAssetOptions, getLists } from "@/lib/lists";
import { nowHHMM, todayISO } from "@/lib/dates";
import ServiceForm from "../ServiceForm";
import { SERVICE_LISTS, type ServiceRow } from "../shared";

export default async function EditServicePage(props: PageProps<"/service/[id]">) {
  const { id } = await props.params;
  if (!/^\d+$/.test(id)) notFound();

  const { supabase, role } = await getSession();
  const [{ data }, lists, assets] = await Promise.all([
    supabase.from("service_log").select("*").eq("id", Number(id)).maybeSingle(),
    getLists(supabase, SERVICE_LISTS),
    getAssetOptions(supabase),
  ]);
  if (!data) notFound();
  const rec = data as ServiceRow;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 px-3 py-4 sm:px-6 sm:py-6">
      <h1 className="text-xl font-bold sm:text-2xl">{rec.req_no}</h1>
      <ServiceForm key={rec.updated_at} rec={rec} lists={lists} assets={assets} canEdit={role === "editor"} today={todayISO()} now={nowHHMM()} />
    </main>
  );
}
