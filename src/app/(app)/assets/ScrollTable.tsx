"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Horizontal scroller for wide tables:
//  - ◀ ▶ buttons above the table (no hunting for the scrollbar at the bottom of a long list)
//  - fade on the right edge while more columns are hidden
//  - mouse drag-to-scroll on desktop (touch already swipes natively); a drag never counts as a row click
export default function ScrollTable({ label, children }: { label: string; children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const [edge, setEdge] = useState({ left: false, right: false });

  const update = useCallback(() => {
    const el = box.current;
    if (!el) return;
    setEdge({ left: el.scrollLeft > 2, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 });
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    // watch both the viewport and the table: the table widens after fonts/data settle
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [update]);

  const step = (dir: 1 | -1) => box.current?.scrollBy({ left: dir * box.current.clientWidth * 0.7, behavior: "smooth" });

  return (
    <div>
      <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-3 py-2">
        <span className="text-xs text-muted">{label}</span>
        <div className="flex gap-1">
          <button type="button" onClick={() => step(-1)} disabled={!edge.left} aria-label="เลื่อนซ้าย"
            className="btn size-8 p-0 disabled:opacity-30"><ChevronLeft className="size-4" /></button>
          <button type="button" onClick={() => step(1)} disabled={!edge.right} aria-label="เลื่อนขวา"
            className="btn size-8 p-0 disabled:opacity-30"><ChevronRight className="size-4" /></button>
        </div>
      </div>
      <div className="relative">
        <div
          ref={box}
          onScroll={update}
          onPointerDown={(e) => {
            if (e.pointerType !== "mouse" || e.button !== 0) return;
            drag.current = { x: e.clientX, left: box.current!.scrollLeft, moved: false };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            const dx = e.clientX - d.x;
            if (Math.abs(dx) > 5) d.moved = true;
            if (d.moved) box.current!.scrollLeft = d.left - dx;
          }}
          onPointerUp={() => { setTimeout(() => (drag.current = null)); }}
          onPointerLeave={() => { drag.current = null; }}
          onClickCapture={(e) => { if (drag.current?.moved) { e.preventDefault(); e.stopPropagation(); } }}
          className={`overflow-x-auto overscroll-x-contain ${edge.left || edge.right ? "cursor-grab active:cursor-grabbing" : ""}`}
        >
          {children}
        </div>
        <div className={`pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[var(--surface)] to-transparent transition-opacity ${edge.right ? "opacity-100" : "opacity-0"}`} />
      </div>
    </div>
  );
}
