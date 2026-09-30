"use client";

// Person 3 owns this screen.
import Link from "next/link";
import { useState } from "react";
import { NOTIFICATIONS_CHANGED } from "@/components/BottomNav";
import { Card, LoadState, PageTitle, Placeholder } from "@/components/Card";
import {
  confirmEvent,
  dismissEvent,
  getEvents,
  getNotifications,
  markNotificationRead,
} from "@/lib/client/api";
import { formatDate } from "@/lib/client/format";
import { useApi } from "@/lib/client/useApi";

export default function NotificationsPage() {
  const { data, loading, error, reload } = useApi(async () => {
    const [notifications, events] = await Promise.all([getNotifications(), getEvents()]);
    return { notifications, events };
  });
  const [busy, setBusy] = useState(false);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
    } catch {
      // generic: the list reload below shows the real state
    }
    await reload();
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
    setBusy(false);
  }

  return (
    <>
      <PageTitle title="Notifications" />
      <LoadState loading={loading && !data} error={error} />
      <div className="flex flex-col gap-3">
        {data?.notifications.map((n) => {
          const event = n.eventId ? data.events.find((e) => e.id === n.eventId) : undefined;
          return (
            <Card key={n.id} className={n.status === "unread" ? "ring-brand/40" : ""}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{n.title}</p>
                {n.status === "unread" && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />}
              </div>
              <p className="mt-1 text-sm text-muted">{n.message}</p>
              <p className="mt-2 text-xs text-muted">{formatDate(n.createdAt)}</p>

              {event && (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-brand">Why am I seeing this?</summary>
                  <ul className="mt-2 list-disc pl-5 text-muted">
                    {event.evidence.map((ev) => (
                      <li key={ev.signal}>{ev.description}</li>
                    ))}
                  </ul>
                </details>
              )}

              {event?.status === "detected" && (
                <div className="mt-3 flex gap-2">
                  <button
                    disabled={busy}
                    onClick={() => act(() => confirmEvent(event.id))}
                    className="flex-1 rounded-full bg-brand py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    Yes, that&apos;s right
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => act(() => dismissEvent(event.id))}
                    className="flex-1 rounded-full bg-canvas py-2 text-sm font-medium ring-1 ring-line disabled:opacity-60"
                  >
                    No, not me
                  </button>
                </div>
              )}
              {event?.status === "confirmed" && (
                <Link href="/recommendations" className="mt-3 inline-block text-sm font-medium text-brand">
                  See what might help ›
                </Link>
              )}
              {event?.status === "dismissed" && (
                <p className="mt-3 text-xs text-muted">Thanks, we won&apos;t ask about this again.</p>
              )}
              {!event && n.status === "unread" && (
                <button
                  disabled={busy}
                  onClick={() => act(() => markNotificationRead(n.id))}
                  className="mt-3 text-xs font-medium text-brand"
                >
                  Mark as read
                </button>
              )}
            </Card>
          );
        })}
      </div>
      <Placeholder owner="Person 3" />
    </>
  );
}
