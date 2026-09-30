"use client";

import { useRouter } from "next/navigation";
import { logout } from "@/lib/client/api";

export function AppHeader({ name }: { name: string }) {
  const router = useRouter();

  async function onLogout() {
    await logout().catch(() => undefined);
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between bg-brand px-5 pb-4 pt-5 text-white">
      <div>
        <p className="text-xs/4 opacity-80">Welcome back</p>
        <p className="text-lg font-semibold">{name}</p>
      </div>
      <button
        onClick={onLogout}
        className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium hover:bg-white/25"
      >
        Log out
      </button>
    </header>
  );
}
