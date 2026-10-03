"use client";

import { useActionState } from "react";
import { Boxes, ClipboardCheck, Wrench } from "lucide-react";
import { signIn, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, {});

  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center bg-gradient-to-br from-[#0f2a44] via-[#1f4e78] to-[#2a78d6] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center text-white">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/15 text-xl font-bold shadow-lg backdrop-blur">IT</span>
          <h1 className="mt-4 text-2xl font-bold">WDI IT Records</h1>
          <p className="mt-1 text-sm text-sky-100/80">บันทึกงาน IT · ตรวจเช็ค · ทรัพย์สิน</p>
          <div className="mt-4 flex justify-center gap-5 text-sky-100/70">
            <ClipboardCheck className="size-5" /><Wrench className="size-5" /><Boxes className="size-5" />
          </div>
        </div>

        <form action={action} className="card space-y-4 p-6">
          <p className="text-sm text-muted">เข้าสู่ระบบด้วยบัญชีเดียวกับระบบลงเวลา</p>
          <label className="block space-y-1">
            <span className="text-sm font-medium">อีเมล</span>
            <input name="email" type="email" autoComplete="email" required className="field" />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">รหัสผ่าน</span>
            <input name="password" type="password" autoComplete="current-password" required className="field" />
          </label>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <button type="submit" disabled={pending} className="btn btn-primary w-full py-2.5">
            {pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    </main>
  );
}
