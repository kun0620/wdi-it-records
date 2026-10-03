"use client";

import { useActionState } from "react";
import { generateExport, type ExportState } from "./actions";

export default function GenerateButton() {
  const [state, action, pending] = useActionState<ExportState>(generateExport, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <button disabled={pending} className="btn btn-primary">
        {pending ? "กำลังสร้างไฟล์…" : "สร้างไฟล์ของวันนี้"}
      </button>
      {state.ok && <span className="text-sm text-green-700">{state.ok}</span>}
      {state.error && <span className="text-sm text-red-600">{state.error}</span>}
    </form>
  );
}
