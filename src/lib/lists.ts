import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type ListItem = { value: string; label: string | null };
export type Lists = Record<string, ListItem[]>;

// Dropdown values from it.list_items (was the "Lists" sheet), grouped by list_key.
export async function getLists(supabase: SupabaseClient, keys: string[]): Promise<Lists> {
  const { data } = await supabase
    .from("list_items")
    .select("list_key, value, label")
    .in("list_key", keys)
    .eq("active", true)
    .order("sort");
  const out: Lists = Object.fromEntries(keys.map((k) => [k, []]));
  for (const r of data ?? []) out[r.list_key].push({ value: r.value, label: r.label });
  return out;
}

// Job positions already used on assets (suggestions for the Desktop/Laptop "position" field).
export async function getPositions(supabase: SupabaseClient): Promise<string[]> {
  const { data } = await supabase.from("assets").select("position").not("position", "is", null);
  return [...new Set((data ?? []).map((r) => r.position as string))].sort();
}

export type AssetOption = { id: number; label: string; user_name: string | null; department: string | null };

// Tagged assets for "which machine is this about?" pickers (Service Log).
export async function getAssetOptions(supabase: SupabaseClient): Promise<AssetOption[]> {
  const { data } = await supabase.from("assets")
    .select("id, asset_tag, manufacturer, model, name, category, user_name, department")
    .not("asset_tag", "is", null).not("status", "in", "(Retired,Planned)").order("asset_tag");
  return (data ?? []).map((a) => ({
    id: a.id,
    user_name: a.user_name,
    department: a.department,
    label: [a.asset_tag, [a.manufacturer, a.model].filter(Boolean).join(" ") || a.name || a.category, a.user_name]
      .filter(Boolean).join(" · "),
  }));
}
