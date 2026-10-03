import { Cctv, Laptop, Monitor, Network, Package, Printer, ScanFace, type LucideIcon } from "lucide-react";
import { prefixOf } from "./shared";

// Kind of machine at a glance (design "kchip"): icon by tag prefix, or by category when untagged.
export const KIND_ICON: Record<string, LucideIcon> = {
  PC: Monitor, NB: Laptop, NW: Network, CA: Cctv, PR: Printer, AC: ScanFace, OT: Package,
};

export function kindOf(tag: string | null, category: string | null) {
  return tag?.match(/^WDI-([A-Z]+)-/)?.[1] ?? prefixOf(category);
}

export default function AssetIcon({ tag, category, size = "md" }: { tag: string | null; category: string | null; size?: "sm" | "md" | "lg" }) {
  const Icon = KIND_ICON[kindOf(tag, category)] ?? Package;
  if (size === "sm") return <span className="kchip sm" style={{ width: 22, height: 22, borderRadius: 7 }}><Icon className="size-3.5" strokeWidth={2} /></span>;
  if (size === "lg") return <span className="kchip lg"><Icon className="size-7" strokeWidth={1.8} /></span>;
  return <span className="kchip" style={{ width: 40, height: 40, borderRadius: 12 }}><Icon className="size-5" strokeWidth={1.8} /></span>;
}
