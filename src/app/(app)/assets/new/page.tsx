import { getSession } from "@/lib/supabase/server";
import { getLists } from "@/lib/lists";
import { todayISO } from "@/lib/dates";
import AssetForm from "../AssetForm";

export default async function NewAssetPage() {
  const { supabase, role } = await getSession();
  const lists = await getLists(supabase, ["user", "dept"]);
  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
      <h1 className="text-lg font-semibold">เพิ่มทรัพย์สิน</h1>
      <AssetForm rec={{ status: "In Stock" }} users={lists.user.map((u) => u.value)} depts={lists.dept.map((d) => d.value)}
        canEdit={role === "editor"} today={todayISO()} />
    </main>
  );
}
