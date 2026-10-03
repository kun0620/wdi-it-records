export type AssetRow = {
  id: number;
  asset_tag: string | null;
  serial: string | null;
  name: string | null;
  model: string | null;
  category: string | null;
  manufacturer: string | null;
  user_name: string | null;
  position: string | null;
  department: string | null;
  location: string | null;
  status: AssetStatus;
  ip_address: string | null;
  mac: string | null;
  purchase_date: string | null;
  warranty_end: string | null;
  vendor: string | null;
  price: number | null;
  remark: string | null;
  source_sheet: string | null;
  updated_at: string;
};

export const ASSET_STATUSES = [
  { v: "In Use", th: "ใช้งาน", tone: "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-100" },
  { v: "In Stock", th: "สต็อก", tone: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100" },
  { v: "Repair", th: "ซ่อม", tone: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100" },
  { v: "Waiting", th: "รอของ", tone: "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-100" },
  { v: "Retired", th: "เลิกใช้", tone: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300" },
  { v: "Lost", th: "สูญหาย", tone: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100" },
  { v: "Planned", th: "แผนจัดซื้อ", tone: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-100" },
] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number]["v"];

// Desktop / Laptop: the only kinds that carry the user's job position
export const isComputer = (category?: string | null, tag?: string | null) =>
  /^WDI-(PC|NB)-/.test(tag ?? "") || /^(desktop|laptop|notebook)/i.test(category ?? "");

export const statusOf = (v: string) => ASSET_STATUSES.find((s) => s.v === v);

// Tag prefix groups (mirror of it.asset_prefix in the DB) — used for the type filter.
export const PREFIXES = [
  { p: "PC", th: "Desktop" },
  { p: "NB", th: "Laptop" },
  { p: "NW", th: "เครือข่าย" },
  { p: "CA", th: "กล้อง/NVR" },
  { p: "PR", th: "เครื่องพิมพ์" },
  { p: "AC", th: "สแกนหน้า" },
  { p: "OT", th: "อื่น ๆ" },
];

// Suggested categories (free text is still allowed; the prefix is derived from it).
export const CATEGORY_SUGGESTIONS = [
  "Desktop", "Laptop", "Printer", "Projector", "Network - Access Point", "Network - Access Switch",
  "Network - Access Switch (PoE)", "Network - Core Switch", "Network - Firewall", "Network - NVR",
  "Network - SD-WAN Router", "Access Control - Face Recognition", "NAS", "UPS", "Monitor",
];

// Mirror of it.asset_prefix(category) in the DB.
export function prefixOf(category: string | null | undefined): string {
  const c = (category ?? "").toLowerCase();
  if (c.startsWith("desktop")) return "PC";
  if (c.startsWith("laptop") || c.startsWith("notebook")) return "NB";
  if (/nvr|cctv|camera/.test(c)) return "CA";
  if (c.startsWith("network")) return "NW";
  if (c.startsWith("printer")) return "PR";
  if (c.startsWith("access control")) return "AC";
  return "OT";
}
