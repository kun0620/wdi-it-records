"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight, Boxes, ClipboardCheck, FileSpreadsheet, LayoutDashboard, LogOut, Menu, Wrench, X,
} from "lucide-react";

const NAV = [
  { href: "/", label: "ภาพรวม", icon: LayoutDashboard },
  { href: "/daily", label: "เช็ครายวัน", icon: ClipboardCheck },
  { href: "/service", label: "คำขอ/ปัญหา", icon: Wrench },
  { href: "/assets", label: "ทรัพย์สิน", icon: Boxes },
  { href: "/handover", label: "รับ-คืน", icon: ArrowLeftRight },
  { href: "/exports", label: "Export", icon: FileSpreadsheet },
];

type Props = { email: string; role: string | null; signOut: () => Promise<void>; children: React.ReactNode };

// Layout per screen (Galaxy Z Fold 5 first):
//   < 640px  cover screen  -> top bar + slide-in drawer
//   640-1023 unfolded       -> 76px icon rail with small labels
//   >= 1024  desktop        -> 240px sidebar with full labels
export default function Shell({ email, role, signOut, children }: Props) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const current = NAV.find((n) => active(n.href));

  const links = (
    <nav className="flex flex-1 flex-col gap-1 px-2.5">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={active(href) ? "page" : undefined}
          onClick={() => setOpen(false)}
          className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors
            sm:max-lg:flex-col sm:max-lg:gap-1 sm:max-lg:px-1 sm:max-lg:py-2 sm:max-lg:text-[10.5px]
            ${active(href) ? "bg-[var(--sidebar-active)] text-white" : "text-[var(--sidebar-ink)] hover:bg-white/5 hover:text-white"}`}
        >
          <Icon className={`size-5 shrink-0 ${active(href) ? "text-sky-300" : ""}`} strokeWidth={1.8} />
          <span className="truncate">{label}</span>
        </Link>
      ))}
    </nav>
  );

  const account = (
    <div className="border-t border-white/10 p-3 sm:max-lg:px-1.5">
      <div className="mb-2 flex items-center gap-2.5 sm:max-lg:justify-center">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sky-400/20 text-xs font-semibold text-sky-200">
          {email.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 sm:max-lg:hidden">
          <div className="truncate text-xs text-white">{email}</div>
          <div className="text-[11px] text-[var(--sidebar-ink)]">{role ?? "ไม่มีสิทธิ์"}</div>
        </div>
      </div>
      <form action={signOut}>
        <button className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-[var(--sidebar-ink)] hover:bg-white/5 hover:text-white sm:max-lg:justify-center">
          <LogOut className="size-4" /> <span className="sm:max-lg:hidden">ออกจากระบบ</span>
        </button>
      </form>
    </div>
  );

  const brand = (
    <Link href="/" className="flex items-center gap-2.5 px-5 py-5 sm:max-lg:justify-center sm:max-lg:px-0">
      <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-sky-400 to-[#1f4e78] text-sm font-bold text-white shadow-lg shadow-sky-900/40">
        IT
      </span>
      <span className="leading-tight sm:max-lg:hidden">
        <span className="block text-sm font-semibold text-white">WDI IT Records</span>
        <span className="block text-[11px] text-[var(--sidebar-ink)]">West Deane New Power</span>
      </span>
    </Link>
  );

  return (
    <div className="min-h-dvh sm:pl-[76px] lg:pl-60 print:!pl-0">
      {/* sidebar: rail / full (sm+) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[76px] flex-col bg-sidebar sm:flex lg:w-60 print:!hidden">
        {brand}
        {links}
        {account}
      </aside>

      {/* drawer (cover screen) */}
      <div className={`fixed inset-0 z-40 sm:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
        <div className={`absolute inset-0 bg-black/50 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={() => setOpen(false)} />
        <aside className={`absolute inset-y-0 left-0 flex w-64 flex-col bg-sidebar transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex items-center justify-between pr-3">
            {brand}
            <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-[var(--sidebar-ink)] hover:bg-white/10" aria-label="ปิดเมนู">
              <X className="size-5" />
            </button>
          </div>
          {links}
          {account}
        </aside>
      </div>

      {/* top bar (cover screen) */}
      <header className="sticky top-0 z-20 flex items-center gap-3 bg-sidebar px-3 py-2.5 text-white sm:hidden print:!hidden">
        <button onClick={() => setOpen(true)} className="rounded-lg p-1.5 hover:bg-white/10" aria-label="เปิดเมนู">
          <Menu className="size-5" />
        </button>
        <span className="font-semibold">{current?.label ?? "WDI IT"}</span>
      </header>

      <div className="min-w-0">{children}</div>
    </div>
  );
}
