import { getSession } from "@/lib/supabase/server";
import { signOut } from "../login/actions";
import Shell from "./Shell";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { user, role } = await getSession();

  return (
    <Shell email={user?.email ?? ""} role={role} signOut={signOut}>
      {role ? children : (
        <main className="mx-auto w-full max-w-3xl px-4 py-8 text-sm">
          บัญชีนี้ยังไม่ได้รับสิทธิ์ใน WDI IT Records — ติดต่อ IT
        </main>
      )}
    </Shell>
  );
}
