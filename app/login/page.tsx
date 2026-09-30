"use client";

import { Briefcase, ChevronRight, LoaderCircle, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { DEMO_LOGINS } from "@/lib/auth/demoUsers";
import { login } from "@/lib/client/api";

export default function LoginPage() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onPick(id: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await login(id);
      // Full navigation: guarantees the new session cookie is used everywhere.
      window.location.assign(res.role === "employee" ? "/employee" : "/dashboard");
    } catch {
      setError("Login failed. Please try again.");
      setBusy(null);
    }
  }

  const customers = DEMO_LOGINS.filter((l) => l.role === "customer");
  const employee = DEMO_LOGINS.find((l) => l.role === "employee")!;

  return (
    <PhoneFrame>
      <div className="bg-brand px-6 pb-12 pt-12 text-white">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-base font-black tracking-tight text-brand">
          LM
        </span>
        <h1 className="mt-5 text-[26px] font-semibold leading-tight">Life Moments</h1>
        <p className="mt-1.5 text-sm text-white/85">Your bank, paying attention — and asking first.</p>
      </div>

      <div className="-mt-6 flex flex-1 flex-col rounded-t-[1.75rem] bg-canvas px-4 pb-6 pt-6">
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
          <ShieldCheck size={15} aria-hidden /> Demo environment — synthetic data only
        </div>

        <p className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted">Log in as</p>
        <div className="flex flex-col gap-2.5">
          {customers.map((l) => (
            <button
              key={l.id}
              onClick={() => onPick(l.id)}
              disabled={busy !== null}
              className="group flex items-center gap-3 rounded-2xl bg-surface p-3.5 text-left shadow-[0_1px_3px_rgba(16,24,40,0.06)] ring-1 ring-line transition hover:ring-brand/50 disabled:opacity-60"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-base font-semibold text-brand">
                {l.name[0]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{l.name}</span>
                <span className="block truncate text-sm text-muted">{l.hint}</span>
              </span>
              {busy === l.id ? (
                <LoaderCircle size={18} className="animate-spin text-brand" aria-label="Logging in" />
              ) : (
                <ChevronRight size={18} className="text-subtle transition group-hover:translate-x-0.5" aria-hidden />
              )}
            </button>
          ))}
        </div>

        {error && (
          <p role="alert" className="mt-3 text-center text-sm font-medium text-brand">
            {error}
          </p>
        )}

        <div className="mt-auto pt-8">
          <button
            onClick={() => onPick(employee.id)}
            disabled={busy !== null}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm text-muted hover:bg-surface hover:text-ink disabled:opacity-60"
          >
            {busy === employee.id ? <LoaderCircle size={15} className="animate-spin" /> : <Briefcase size={15} aria-hidden />}
            KBC employee login
          </button>
        </div>
      </div>
    </PhoneFrame>
  );
}
