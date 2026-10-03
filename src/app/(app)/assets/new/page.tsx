import { getSession } from "@/lib/supabase/server";
import { getLists, getPositions } from "@/lib/lists";
import { todayISO } from "@/lib/dates";
import AssetForm from "../AssetForm";

export default async function NewAssetPage() {
  const { supabase, role } = await getSession();
  const [lists, positions] = await Promise.all([getLists(supabase, ["user", "dept"]), getPositions(supabase)]);
  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 px-3 py-4 sm:px-6 sm:py-6">
      <h1 className="text-xl font-bold sm:text-2xl">เพิ่มทรัพย์สิน</h1>
      <AssetForm rec={{ status: "In Stock" }} users={lists.user.map((u) => u.value)} depts={lists.dept.map((d) => d.value)} positions={positions}
        canEdit={role === "editor"} today={todayISO()} />
    </main>
  );
}
