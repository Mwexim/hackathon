"use client";

// Person 2 owns this screen.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEMO_LOGINS } from "@/lib/auth/demoUsers";
import { login } from "@/lib/client/api";

export default function LoginPage() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onPick(id: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await login(id);
      router.replace(res.role === "employee" ? "/employee" : "/dashboard");
      router.refresh();
    } catch {
      setError("Login failed. Please try again.");
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="bg-brand px-6 pb-10 pt-14 text-white">
        <p className="text-sm opacity-80">Demo bank</p>
        <h1 className="mt-1 text-2xl font-semibold">Life Moments</h1>
        <p className="mt-2 text-sm opacity-90">Choose a demo profile to log in. All data is synthetic.</p>
      </div>
      <div className="-mt-5 flex flex-1 flex-col gap-3 rounded-t-3xl bg-canvas px-4 pt-6">
        {DEMO_LOGINS.map((l) => (
          <button
            key={l.id}
            onClick={() => onPick(l.id)}
            disabled={busy !== null}
            className={`flex items-center gap-3 rounded-2xl bg-surface p-4 text-left shadow-sm ring-1 ring-line transition hover:ring-brand disabled:opacity-60 ${
              l.role === "employee" ? "mt-3" : ""
            }`}
          >
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                l.role === "employee" ? "bg-ink text-white" : "bg-brand-soft text-brand"
              }`}
            >
              {l.name[0]}
            </span>
            <span className="flex-1">
              <span className="block font-medium">{l.name}</span>
              <span className="block text-xs text-muted">{l.subtitle}</span>
            </span>
            <span className="text-muted">{busy === l.id ? "…" : "›"}</span>
          </button>
        ))}
        {error && <p className="text-center text-sm text-brand">{error}</p>}
      </div>
    </div>
  );
}
