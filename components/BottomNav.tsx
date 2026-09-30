"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getNotifications } from "@/lib/client/api";

/** Fire this after changing notification state so the badge refreshes. */
export const NOTIFICATIONS_CHANGED = "notifications-changed";

const ITEMS = [
  { href: "/dashboard", label: "Home", icon: "⌂" },
  { href: "/accounts", label: "Accounts", icon: "▤" },
  { href: "/transactions", label: "Transactions", icon: "⇄" },
  { href: "/notifications", label: "Notifications", icon: "🔔" },
];

export function BottomNav() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const load = () =>
      getNotifications()
        .then((ns) => setUnread(ns.filter((n) => n.status === "unread").length))
        .catch(() => setUnread(0));
    load();
    window.addEventListener(NOTIFICATIONS_CHANGED, load);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED, load);
  }, [pathname]);

  return (
    <nav className="sticky bottom-0 z-10 grid grid-cols-4 border-t border-line bg-surface/95 backdrop-blur">
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] ${
              active ? "font-semibold text-brand" : "text-muted"
            }`}
          >
            <span className="text-lg leading-none" aria-hidden>
              {item.icon}
            </span>
            {item.label}
            {item.href === "/notifications" && unread > 0 && (
              <span className="absolute right-[22%] top-1.5 min-w-4 rounded-full bg-brand px-1 text-center text-[10px] font-semibold leading-4 text-white">
                {unread}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
