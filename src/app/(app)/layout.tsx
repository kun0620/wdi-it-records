import Link from "next/link";
import { getSession } from "@/lib/supabase/server";
import { signOut } from "../login/actions";

const NAV = [
  { href: "/", label: "ภาพรวม" },
  { href: "/daily", label: "เช็ครายวัน" },
  { href: "/service", label: "คำขอ/ปัญหา" },
  { href: "/exports", label: "Export" },
];

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { user, role } = await getSession();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-black/10 dark:border-white/15">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-4 px-4 py-3">
          <span className="font-semibold">WDI IT</span>
          <nav className="flex flex-1 gap-3 text-sm">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="opacity-80 hover:opacity-100">{n.label}</Link>
            ))}
          </nav>
          <span className="hidden text-xs opacity-60 sm:inline">{user?.email} · {role ?? "-"}</span>
          <form action={signOut}>
            <button className="rounded-md border border-black/15 px-2.5 py-1 text-xs dark:border-white/20">ออก</button>
          </form>
        </div>
      </header>
      {role ? children : (
        <main className="mx-auto w-full max-w-3xl px-4 py-8 text-sm">
          บัญชีนี้ยังไม่ได้รับสิทธิ์ใน WDI IT Records — ติดต่อ IT
        </main>
      )}
    </div>
  );
}
