"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRight, Boxes, CalendarRange, ClipboardCheck, FileText, ShieldCheck, FileSpreadsheet, LayoutDashboard, LogOut, Menu, Moon, Search, Sun, Wrench, X,
} from "lucide-react";

export type ShellInfo = { openService: number; daily: { done: number; ng: number } | null };

const NAV = [
  { href: "/", label: "ภาพรวม", icon: LayoutDashboard },
  { href: "/daily", label: "เช็ครายวัน", icon: ClipboardCheck },
  { href: "/weekly", label: "เช็ครายสัปดาห์", icon: CalendarRange },
  { href: "/maintenance", label: "บำรุงรักษา", icon: ShieldCheck },
  { href: "/service", label: "คำขอ/ปัญหา", icon: Wrench, badge: "service" as const },
  { href: "/assets", label: "ทรัพย์สิน", icon: Boxes },
  { href: "/handover", label: "รับ-คืน", icon: ArrowLeftRight },
  { href: "/documents", label: "เอกสาร", icon: FileText },
  { href: "/exports", label: "Export", icon: FileSpreadsheet },
];

type Props = { email: string; role: string | null; info: ShellInfo; signOut: () => Promise<void>; children: React.ReactNode };

const initials = (email: string) => email.split("@")[0].replace(/[^a-z]/gi, "").slice(0, 2).toUpperCase() || "IT";

// Light / dark toggle (desktop header). Stored per browser; without a choice the OS decides.
function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the pre-paint choice once
    setTheme(t === "dark" || t === "light" ? t : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }, []);
  const pick = (t: "light" | "dark") => {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem("theme", t); } catch {}
    setTheme(t);
  };
  return (
    <div className="themes" role="group" aria-label="ธีม">
      <button className={theme === "light" ? "on" : ""} aria-label="โหมดสว่าง" aria-pressed={theme === "light"} onClick={() => pick("light")}><Sun className="size-4" /></button>
      <button className={theme === "dark" ? "on" : ""} aria-label="โหมดมืด" aria-pressed={theme === "dark"} onClick={() => pick("dark")}><Moon className="size-4" /></button>
    </div>
  );
}

// Layout per screen (Galaxy Z Fold 5 first), as in the design canvas:
//   < 640px  cover screen -> 56px top bar + slide-in drawer
//   640-1023 unfolded      -> 76px rail + 60px page header
//   >= 1024  desktop       -> 240px sidebar + 68px header (search, theme)
export default function Shell({ email, role, info, signOut, children }: Props) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const current = NAV.find((n) => active(n.href)) ?? NAV[0];
  const badge = (b?: "service") => (b === "service" && info.openService > 0 ? info.openService : null);

  const sidebar = (onNav?: () => void) => (
    <>
      <div className="brand">
        <span className="logo lg">IT</span>
        <div><b>WDI IT Records</b><span>West Deane New Power</span></div>
      </div>
      <div className="sec">เมนู</div>
      <nav aria-label="เมนูหลัก">
        {NAV.map(({ href, label, icon: Icon, badge: b }) => (
          <Link key={href} href={href} onClick={onNav} className={active(href) ? "on" : ""} aria-current={active(href) ? "page" : undefined}>
            <Icon className="ic size-5" strokeWidth={1.8} /><span>{label}</span>
            {badge(b) && <span className="count">{badge(b)}</span>}
          </Link>
        ))}
      </nav>
      <div className="sp" />
      <Link href="/daily" onClick={onNav} className="hq block">
        <b>Daily Check วันนี้</b><br />
        {info.daily ? `${info.daily.done}/7 ข้อ${info.daily.ng ? ` · พบ NG ${info.daily.ng} ข้อ` : " · ไม่พบ NG"}` : "ยังไม่ได้เช็ค"}
      </Link>
      <div className="me">
        <span className="avatar">{initials(email)}</span>
        <div className="min-w-0"><b className="truncate">{email}</b><span>{role === "editor" ? "IT Engineer · editor" : role ?? "-"}</span></div>
        <form action={signOut} className="ml-auto">
          <button className="icon-btn" aria-label="ออกจากระบบ" title="ออกจากระบบ"><LogOut className="size-[18px]" /></button>
        </form>
      </div>
    </>
  );

  return (
    <div className="min-h-dvh sm:pl-[76px] lg:pl-60 print:!pl-0">
      {/* desktop sidebar */}
      <aside className="side on-side fixed inset-y-0 left-0 z-30 hidden lg:flex print:!hidden">{sidebar()}</aside>

      {/* unfolded rail */}
      <aside className="rail fixed inset-y-0 left-0 z-30 hidden sm:flex lg:hidden print:!hidden" aria-label="เมนูหลัก">
        <Link href="/" className="logo lg">IT</Link>
        {NAV.map(({ href, label, icon: Icon, badge: b }) => (
          <Link key={href} href={href} className={active(href) ? "on" : ""} aria-current={active(href) ? "page" : undefined}>
            <span className="ib"><Icon className="size-5" strokeWidth={1.8} /></span>{label}
            {badge(b) && <span className="count">{badge(b)}</span>}
          </Link>
        ))}
        <span className="sp" />
        <form action={signOut}>
          <button className="avatar sm" aria-label="ออกจากระบบ" title={`${email} · ออกจากระบบ`}>{initials(email)}</button>
        </form>
      </aside>

      {/* cover-screen drawer */}
      <div className={`fixed inset-0 z-40 sm:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
        <div className={`absolute inset-0 bg-[var(--scrim)] transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={() => setOpen(false)} />
        <aside className={`side on-side absolute inset-y-0 left-0 w-[288px] max-w-[85vw] transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"}`}>
          <button onClick={() => setOpen(false)} className="icon-btn absolute right-2 top-3 !border-transparent !bg-transparent !text-[var(--sideMuted)]" aria-label="ปิดเมนู">
            <X className="size-5" />
          </button>
          {sidebar(() => setOpen(false))}
        </aside>
      </div>

      {/* headers */}
      <header className="cv-top sticky top-0 z-20 sm:hidden print:!hidden">
        <button onClick={() => setOpen(true)} className="icon-btn" aria-label="เปิดเมนู"><Menu className="size-[22px]" /></button>
        <span className="logo">IT</span>
        <div className="cv-title" style={{ marginLeft: 6 }}>{current.label}</div>
        {badge(current.badge) && <span className="count mr-2">{badge(current.badge)}</span>}
      </header>
      <header className="in-head sticky top-0 z-20 hidden sm:flex lg:hidden print:!hidden">
        <h1 className="h1">{current.label}</h1>
        <ThemeToggle />
      </header>
      <header className="dk-head sticky top-0 z-20 hidden lg:flex print:!hidden">
        <div className="ttl">
          <div className="crumb">WDI IT Records</div>
          <h1 className="h1">{current.label}</h1>
        </div>
        <form className="iwrap" style={{ width: 300 }} onSubmit={(e) => {
          e.preventDefault();
          const q = new FormData(e.currentTarget).get("q");
          router.push(`/assets?q=${encodeURIComponent(String(q ?? ""))}`);
        }}>
          <Search className="ic prefix size-4" />
          <input name="q" className="input pl search" placeholder="ค้นหาแท็ก, S/N, ผู้ใช้, IP…" aria-label="ค้นหาทรัพย์สิน" />
        </form>
        <ThemeToggle />
      </header>

      <div className="min-w-0">{children}</div>
    </div>
  );
}
