import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Short link printed in the QR label: /a/WDI-NB-0011 -> /assets/<id>.
// Kept short so the QR code stays small and easy to scan.
export async function GET(request: NextRequest, ctx: RouteContext<"/a/[tag]">) {
  const { tag } = await ctx.params;
  const supabase = await createClient();
  const { data } = await supabase.from("assets").select("id").ilike("asset_tag", tag.replace(/[%_]/g, "")).maybeSingle();
  const dest = data ? `/assets/${data.id}` : `/assets?q=${encodeURIComponent(tag)}`;
  return NextResponse.redirect(new URL(dest, request.url));
}
