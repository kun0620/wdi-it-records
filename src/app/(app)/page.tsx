import { getSession } from "@/lib/supabase/server";

// Temporary home until the dashboard is built.
export default async function Home() {
  const { supabase } = await getSession();
  const { data: assets } = await supabase.from("assets").select("source_sheet");
  const bySheet = Object.entries(
    (assets ?? []).reduce<Record<string, number>>((acc, a) => {
      acc[a.source_sheet] = (acc[a.source_sheet] ?? 0) + 1;
      return acc;
    }, {}),
  );

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <section className="rounded-xl border border-black/10 p-4 dark:border-white/15">
        <h2 className="mb-2 font-medium">ทรัพย์สินที่นำเข้า</h2>
        <ul className="space-y-1 text-sm">
          {bySheet.map(([sheet, n]) => (
            <li key={sheet} className="flex justify-between"><span>{sheet}</span><span>{n}</span></li>
          ))}
        </ul>
      </section>
    </main>
  );
}
