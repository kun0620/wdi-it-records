"use client";

export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="rounded-md bg-foreground px-4 py-2 text-sm text-background">
      พิมพ์
    </button>
  );
}
