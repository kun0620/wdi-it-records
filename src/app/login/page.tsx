"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, {});

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <form action={action} className="w-full max-w-sm space-y-4 rounded-xl border border-black/10 p-6 dark:border-white/15">
        <div>
          <h1 className="text-xl font-semibold">WDI IT Records</h1>
          <p className="text-sm opacity-70">เข้าสู่ระบบด้วยบัญชีเดียวกับระบบลงเวลา</p>
        </div>
        <label className="block space-y-1">
          <span className="text-sm">อีเมล</span>
          <input name="email" type="email" autoComplete="email" required
            className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20" />
        </label>
        <label className="block space-y-1">
          <span className="text-sm">รหัสผ่าน</span>
          <input name="password" type="password" autoComplete="current-password" required
            className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20" />
        </label>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button type="submit" disabled={pending}
          className="w-full rounded-md bg-foreground py-2 text-background disabled:opacity-50">
          {pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
        </button>
      </form>
    </main>
  );
}
