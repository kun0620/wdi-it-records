import { getSession } from "@/lib/supabase/server";
import { getLists } from "@/lib/lists";
import { todayISO } from "@/lib/dates";
import HandoverForm, { type PickAsset } from "../HandoverForm";

export default async function NewHandoverPage(props: PageProps<"/handover/new">) {
  const sp = await props.searchParams;
  const { supabase, role } = await getSession();
  if (role !== "editor") return <main className="mx-auto max-w-3xl px-4 py-8 text-sm">ต้องเป็น editor</main>;

  const [{ data }, lists] = await Promise.all([
    supabase.from("assets").select("id, asset_tag, manufacturer, model, name, category, status, user_name, department")
      .in("status", ["In Use", "In Stock", "Repair"]).not("asset_tag", "is", null).order("asset_tag"),
    getLists(supabase, ["user", "dept", "condition"]),
  ]);
  const assets: PickAsset[] = (data ?? []).map((a) => ({
    id: a.id, asset_tag: a.asset_tag, status: a.status, user_name: a.user_name, department: a.department,
    label: [a.manufacturer, a.model].filter(Boolean).join(" ") || a.name || a.category || "",
  }));
  const pre = Number(sp.asset) || null;

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
      <h1 className="text-lg font-semibold">บันทึกส่งมอบ / รับคืนอุปกรณ์</h1>
      <HandoverForm
        assets={assets}
        initialAsset={assets.some((a) => a.id === pre) ? pre : null}
        users={lists.user.map((u) => u.value)}
        depts={lists.dept.map((d) => d.value)}
        conditions={lists.condition.map((c) => c.value)}
        today={todayISO()}
      />
    </main>
  );
}
