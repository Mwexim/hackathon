"use client";

import { ArrowLeftRight, Bell, House, Settings, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getNotifications } from "@/lib/client/api";

/** Dispatch this window event after changing notification state so the badge refreshes. */
export const NOTIFICATIONS_CHANGED = "notifications-changed";

const ITEMS = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/transactions", label: "Payments", icon: ArrowLeftRight },
  { href: "/notifications", label: "Inbox", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
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
    <nav className="sticky bottom-0 z-20 grid grid-cols-5 border-t border-line bg-surface/95 pb-1 backdrop-blur">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href ||
          pathname.startsWith(href + "/") ||
          (href === "/notifications" && (pathname.startsWith("/recommendations") || pathname.startsWith("/apply")));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors ${
              active ? "font-semibold text-brand" : "text-muted hover:text-ink"
            }`}
          >
            <Icon size={21} strokeWidth={active ? 2.4 : 2} aria-hidden />
            {label}
            {href === "/notifications" && unread > 0 && (
              <span
                aria-label={`${unread} unread`}
                className="absolute left-1/2 top-1.5 ml-1.5 min-w-[18px] rounded-full bg-brand px-1 text-center text-[10px] font-bold leading-[18px] text-white ring-2 ring-surface"
              >
                {unread}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
