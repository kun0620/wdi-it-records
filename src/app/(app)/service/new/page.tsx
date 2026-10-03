import { getSession } from "@/lib/supabase/server";
import { getAssetOptions, getLists } from "@/lib/lists";
import { nowHHMM, todayISO } from "@/lib/dates";
import ServiceForm from "../ServiceForm";
import { SERVICE_LISTS } from "../shared";

// Optional prefill via query string, e.g. from a Daily Check NG: ?type=Incident&system=VPN&detail=...
export default async function NewServicePage(props: PageProps<"/service/new">) {
  const sp = await props.searchParams;
  const pick = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const { supabase, role } = await getSession();
  const [lists, assets] = await Promise.all([getLists(supabase, SERVICE_LISTS), getAssetOptions(supabase)]);
  // ?asset=<id> (from an asset page): link it and default requester/department to its current user
  const asset = assets.find((a) => a.id === Number(pick("asset"))) ?? null;

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
      <h1 className="text-lg font-semibold">เพิ่มคำขอ / แจ้งปัญหา</h1>
      <ServiceForm
        rec={{
          type: pick("type"), system: pick("system"), detail: pick("detail"),
          priority: (pick("priority") as "P1" | "P2" | "P3" | "P4" | undefined) ?? "P3",
          escalation: "None", requester: pick("requester") ?? asset?.user_name ?? undefined,
          dept: asset?.department ?? undefined, asset_id: asset?.id ?? null,
        }}
        lists={lists}
        assets={assets}
        canEdit={role === "editor"}
        today={todayISO()}
        now={nowHHMM()}
      />
    </main>
  );
}
