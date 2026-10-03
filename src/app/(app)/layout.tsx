import { getSession } from "@/lib/supabase/server";
import { todayISO } from "@/lib/dates";
import { signOut } from "../login/actions";
import Shell, { type ShellInfo } from "./Shell";

const CHECK_COLS = ["firewall", "wan", "vpn", "core_switch", "wifi", "cctv", "ups"] as const;

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { supabase, user, role } = await getSession();

  // Sidebar badges: open service requests, and today's daily-check progress.
  let info: ShellInfo = { openService: 0, daily: null };
  if (role) {
    const [{ count }, { data: dc }] = await Promise.all([
      supabase.from("service_log").select("id", { count: "exact", head: true }).in("status", ["Open", "In Progress", "Waiting HQ/Vendor"]),
      supabase.from("daily_check").select(CHECK_COLS.join(",")).eq("check_date", todayISO()).maybeSingle(),
    ]);
    const row = dc as Record<string, string | null> | null;
    info = {
      openService: count ?? 0,
      daily: row ? { done: CHECK_COLS.filter((c) => row[c]).length, ng: CHECK_COLS.filter((c) => row[c] === "NG").length } : null,
    };
  }

  return (
    <Shell email={user?.email ?? ""} role={role} info={info} signOut={signOut}>
      {role ? children : (
        <main className="mx-auto w-full max-w-3xl px-4 py-8 text-sm">
          บัญชีนี้ยังไม่ได้รับสิทธิ์ใน WDI IT Records — ติดต่อ IT
        </main>
      )}
    </Shell>
  );
}
