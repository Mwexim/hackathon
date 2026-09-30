"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { logout } from "@/lib/client/api";

export function AppHeader({ name }: { name: string }) {
  const [busy, setBusy] = useState(false);

  async function onLogout() {
    setBusy(true);
    await logout().catch(() => undefined);
    window.location.assign("/login"); // full reload clears all client state
  }

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between bg-brand px-5 py-3.5 text-white">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-sm font-black tracking-tight text-brand">
          LM
        </span>
        <span className="text-[15px] font-semibold">Life Moments</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-semibold" title={name}>
          {name[0]}
        </span>
        <button
          onClick={onLogout}
          disabled={busy}
          aria-label="Log out"
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/15 disabled:opacity-60"
        >
          <LogOut size={18} aria-hidden />
        </button>
      </div>
    </header>
  );
}
