import { getSession } from "@/lib/supabase/server";
import { signOut } from "./login/actions";

// Temporary home: proves login + RLS end to end. Replaced by the dashboard next.
export default async function Home() {
  const { supabase, user, role } = await getSession();
  const { data: assets } = await supabase.from("assets").select("source_sheet");
  const bySheet = Object.entries(
    (assets ?? []).reduce<Record<string, number>>((acc, a) => {
      acc[a.source_sheet] = (acc[a.source_sheet] ?? 0) + 1;
      return acc;
    }, {}),
  );

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">WDI IT Records</h1>
          <p className="text-sm opacity-70">
            {user?.email} · {role ?? "ไม่มีสิทธิ์ในระบบนี้"}
          </p>
        </div>
        <form action={signOut}>
          <button className="rounded-md border border-black/15 px-3 py-1.5 text-sm dark:border-white/20">ออกจากระบบ</button>
        </form>
      </header>

      {role ? (
        <section className="rounded-xl border border-black/10 p-4 dark:border-white/15">
          <h2 className="mb-2 font-medium">ทรัพย์สินที่นำเข้า</h2>
          <ul className="space-y-1 text-sm">
            {bySheet.map(([sheet, n]) => (
              <li key={sheet} className="flex justify-between"><span>{sheet}</span><span>{n}</span></li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-sm">บัญชีนี้ยังไม่ได้รับสิทธิ์ใน WDI IT Records — ติดต่อ IT</p>
      )}
    </main>
  );
}
