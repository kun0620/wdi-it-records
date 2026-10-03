"use client";

import { useActionState } from "react";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { signIn, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, {});

  return (
    <main className="relative flex min-h-dvh flex-1 items-center justify-center overflow-hidden px-4 py-16">
      <div className="login-bg" />
      <div className="grid-lines" />
      <span className="pointer-events-none absolute rounded-full" style={{ width: 520, height: 520, border: "1px solid rgba(255,255,255,.08)", right: -220, top: -200 }} />
      <span className="pointer-events-none absolute rounded-full" style={{ width: 340, height: 340, border: "1px solid rgba(255,255,255,.08)", right: -130, top: -110 }} />
      <div className="row absolute left-5 top-5 text-white" style={{ gap: 10 }}>
        <span className="logo">IT</span><span style={{ fontWeight: 600, fontSize: 14 }}>WDI IT Records</span>
      </div>

      <form action={action} className="card relative w-full max-w-[400px]" style={{ padding: "28px 24px", borderRadius: 20, boxShadow: "0 24px 60px rgba(4,14,26,.45)" }}>
        <div className="col" style={{ alignItems: "center", textAlign: "center", marginBottom: 22 }}>
          <span className="logo xl" style={{ marginBottom: 14 }}>IT</span>
          <h1 className="h1">WDI IT Records</h1>
          <div className="small muted">เข้าสู่ระบบด้วยบัญชีเดียวกับระบบลงเวลา</div>
        </div>
        <div className="col" style={{ gap: 14 }}>
          <div className="field">
            <label htmlFor="email">อีเมล</label>
            <div className="iwrap">
              <input id="email" name="email" type="email" autoComplete="email" required className="input pr" />
              <Mail className="ic suffix size-4" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="password">รหัสผ่าน</label>
            <div className="iwrap">
              <input id="password" name="password" type="password" autoComplete="current-password" required className="input pr" />
              <Lock className="ic suffix size-4" />
            </div>
          </div>
          {state.error && <p className="ierr">{state.error}</p>}
          <button type="submit" disabled={pending} className="btn btn-primary btn-lg btn-block" style={{ marginTop: 4 }}>
            {pending ? "กำลังเข้าสู่ระบบ…" : <>เข้าสู่ระบบ<ArrowRight className="size-4" /></>}
          </button>
        </div>
        <div className="small muted" style={{ textAlign: "center", marginTop: 18 }}>เฉพาะเจ้าหน้าที่ IT · West Deane New Power</div>
      </form>

      <div className="small absolute inset-x-0 bottom-5 text-center" style={{ color: "#9FB8D2" }}>IT Department · West Deane New Power</div>
    </main>
  );
}
