"use client";

import { useRouter } from "next/navigation";

// Whole table row opens the asset (the tag cell also holds a real <Link> for keyboard / middle-click).
export default function AssetRowLink({ href, children }: { href: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <tr
      onClick={(e) => { if (!(e.target as HTMLElement).closest("a")) router.push(href); }}
      className="group cursor-pointer"
    >
      {children}
    </tr>
  );
}
