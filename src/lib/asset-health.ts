import type { createClient } from "@/lib/supabase/server";
import { daysBetween } from "@/lib/dates";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Statuses for machines we physically have and look after.
export const ACTIVE = ["In Use", "In Stock", "Repair"];
export const WARRANTY_DAYS = 60;

type Item = { id: number; asset_tag: string | null; label: string; user_name: string | null };
export type AssetHealth = {
  total: number;
  byStatus: Record<string, number>;
  warranty: (Item & { warranty_end: string; days: number })[];   // expired or ending within WARRANTY_DAYS
  missingSerial: Item[];                                          // active, no S/N
  topRepairs: (Item & { count: number })[];                       // most service requests, last 12 months
};

const label = (a: { manufacturer: string | null; model: string | null; name: string | null; category: string | null }) =>
  [a.manufacturer, a.model].filter(Boolean).join(" ") || a.name || a.category || "";

// Asset section of the dashboard and the export summary, computed from the register.
export async function assetHealth(supabase: Supabase, today: string): Promise<AssetHealth> {
  const yearAgo = new Date(Date.parse(today) - 365 * 864e5).toISOString().slice(0, 10);
  const [{ data: assets }, { data: services }] = await Promise.all([
    supabase.from("assets").select("id, asset_tag, status, manufacturer, model, name, category, serial, user_name, warranty_end"),
    supabase.from("service_log").select("asset_id").not("asset_id", "is", null).gte("req_date", yearAgo),
  ]);
  const rows = assets ?? [];
  const item = (a: (typeof rows)[number]): Item => ({ id: a.id, asset_tag: a.asset_tag, label: label(a), user_name: a.user_name });
  const active = rows.filter((a) => ACTIVE.includes(a.status));

  const byStatus: Record<string, number> = {};
  for (const a of rows) byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;

  const warranty = active
    .filter((a) => a.warranty_end && daysBetween(today, a.warranty_end) <= WARRANTY_DAYS)
    .map((a) => ({ ...item(a), warranty_end: a.warranty_end as string, days: daysBetween(today, a.warranty_end as string) }))
    .sort((x, y) => x.days - y.days);

  const counts = new Map<number, number>();
  for (const s of services ?? []) counts.set(s.asset_id, (counts.get(s.asset_id) ?? 0) + 1);
  const topRepairs = rows
    .filter((a) => counts.has(a.id))
    .map((a) => ({ ...item(a), count: counts.get(a.id)! }))
    .sort((x, y) => y.count - x.count)
    .slice(0, 5);

  return {
    total: rows.length,
    byStatus,
    warranty,
    missingSerial: active.filter((a) => !a.serial?.trim()).map(item),
    topRepairs,
  };
}
