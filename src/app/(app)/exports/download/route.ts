import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Short-lived signed URL for one export file; Storage RLS decides whether this user may read it.
export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path") ?? "";
  if (!/^\d{4}\/(\d{2}\/daily|monthly)\/IT-Records_[\d-]+\.xlsx$/.test(path)) {
    return new NextResponse("Bad path", { status: 400 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("it-exports")
    .createSignedUrl(path, 60, { download: path.split("/").pop() });
  if (error || !data) return new NextResponse("Not found", { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
