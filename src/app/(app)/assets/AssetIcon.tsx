import { Cctv, Laptop, Monitor, Network, Package, Printer, ScanFace, type LucideIcon } from "lucide-react";
import { prefixOf } from "./shared";

// Kind of machine at a glance: icon by tag prefix (or category when untagged).
const KIND: Record<string, { icon: LucideIcon; cls: string }> = {
  PC: { icon: Monitor, cls: "bg-sky-500/12 text-sky-600 dark:text-sky-400" },
  NB: { icon: Laptop, cls: "bg-indigo-500/12 text-indigo-600 dark:text-indigo-400" },
  NW: { icon: Network, cls: "bg-teal-500/12 text-teal-600 dark:text-teal-400" },
  CA: { icon: Cctv, cls: "bg-rose-500/12 text-rose-600 dark:text-rose-400" },
  PR: { icon: Printer, cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  AC: { icon: ScanFace, cls: "bg-violet-500/12 text-violet-600 dark:text-violet-400" },
  OT: { icon: Package, cls: "bg-slate-500/12 text-slate-600 dark:text-slate-400" },
};

export default function AssetIcon({ tag, category, size = "md" }: { tag: string | null; category: string | null; size?: "sm" | "md" | "lg" }) {
  const p = tag?.match(/^WDI-([A-Z]+)-/)?.[1] ?? prefixOf(category);
  const { icon: Icon, cls } = KIND[p] ?? KIND.OT;
  return (
    <span className={`grid shrink-0 place-items-center rounded-xl ${cls} ${size === "lg" ? "size-12" : size === "sm" ? "size-7 rounded-lg" : "size-10"}`}>
      <Icon className={size === "lg" ? "size-6" : size === "sm" ? "size-4" : "size-5"} strokeWidth={1.8} />
    </span>
  );
}
