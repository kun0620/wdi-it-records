import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

// Server-side Supabase client bound to the signed-in user's session cookie.
// All queries go to schema "it"; RLS decides what this user may read or write.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      db: { schema: "it" },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // proxy.ts refreshes the session, so this is safe to ignore.
          }
        },
      },
    },
  );
}

export type Role = "editor" | "viewer" | null;

// Current user + their role in it.members (null role = signed in but not a member).
// cache(): the layout and the page of one request share a single lookup.
// getClaims() verifies the session JWT locally (no Auth round trip when the project uses asymmetric keys).
export const getSession = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return { supabase, user: null, role: null as Role };
  const { data: role } = await supabase.rpc("my_role");
  return { supabase, user: { id: claims.sub, email: (claims.email as string | undefined) ?? "" }, role: (role ?? null) as Role };
});
