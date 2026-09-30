"use client";

import { Bell, ChevronDown, ChevronRight, Inbox } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { NOTIFICATIONS_CHANGED } from "@/components/BottomNav";
import { LifeEventCard } from "@/components/life";
import { Card, EmptyState, ErrorState, PageTitle, SectionTitle, SkeletonList, cx } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { confirmEvent, dismissEvent, getEvents, getNotifications, markNotificationRead } from "@/lib/client/api";
import { formatDate } from "@/lib/client/format";
import { LIFE_COPY } from "@/lib/client/lifeCopy";
import { useApi } from "@/lib/client/useApi";
import type { LifeEvent, Notification } from "@/lib/types";

type Data = { notifications: Notification[]; events: LifeEvent[] };

export default function NotificationsPage() {
  const { data, loading, error, reload } = useApi<Data>(async () => {
    const [notifications, events] = await Promise.all([getNotifications(), getEvents()]);
    return { notifications, events };
  });
  const [overrides, setOverrides] = useState<Record<string, LifeEvent["status"]>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [handledNow, setHandledNow] = useState<Set<string>>(new Set());
  const [readNow, setReadNow] = useState<Set<string>>(new Set());
  const [showHandled, setShowHandled] = useState(false);
  const { toast, showToast } = useToast();

  if (error) return <ErrorState onRetry={reload} />;
  if (loading && !data) return <SkeletonList rows={3} />;
  if (!data) return null;

  const eventOf = (n: Notification) => {
    const e = n.eventId ? data.events.find((x) => x.id === n.eventId) : undefined;
    return e ? { ...e, status: overrides[e.id] ?? e.status } : undefined;
  };

  async function decide(event: LifeEvent, status: "confirmed" | "dismissed") {
    setPending(event.id);
    setOverrides((o) => ({ ...o, [event.id]: status })); // optimistic
    setHandledNow((s) => new Set(s).add(event.id));
    try {
      await (status === "confirmed" ? confirmEvent(event.id) : dismissEvent(event.id));
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
    } catch {
      setOverrides(({ [event.id]: _, ...rest }) => rest); // rollback
      setHandledNow((s) => {
        const next = new Set(s);
        next.delete(event.id);
        return next;
      });
      showToast("That didn't work. Please try again.");
    } finally {
      setPending(null);
    }
  }

  async function read(n: Notification) {
    if (n.status !== "unread" || readNow.has(n.id)) return;
    setReadNow((s) => new Set(s).add(n.id));
    try {
      await markNotificationRead(n.id);
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
    } catch {
      setReadNow((s) => {
        const next = new Set(s);
        next.delete(n.id);
        return next;
      });
    }
  }

  const lifeItems = data.notifications
    .filter((n) => n.kind === "life_event")
    .map((n) => ({ n, e: eventOf(n) }))
    .filter((x): x is { n: Notification; e: LifeEvent } => !!x.e);
  const toCheck = lifeItems.filter(({ e }) => e.status === "detected" || handledNow.has(e.id));
  const handled = lifeItems.filter(({ e }) => e.status !== "detected" && !handledNow.has(e.id));
  const general = data.notifications.filter((n) => n.kind === "general");

  return (
    <div className="animate-fade-in">
      <PageTitle title="Inbox" />

      {toCheck.length > 0 && (
        <>
          <SectionTitle>For you to check</SectionTitle>
          <div className="flex flex-col gap-3">
            {toCheck.map(({ n, e }) => (
              <LifeEventCard
                key={n.id}
                notification={n}
                event={e}
                pending={pending === e.id}
                justHandled={handledNow.has(e.id)}
                onConfirm={() => decide(e, "confirmed")}
                onDismiss={() => decide(e, "dismissed")}
              />
            ))}
          </div>
        </>
      )}

      <SectionTitle>Other messages</SectionTitle>
      {general.length === 0 ? (
        <EmptyState icon={<Inbox size={28} />} title="No messages" />
      ) : (
        <Card className="divide-y divide-line p-0">
          {general.map((n) => {
            const unread = n.status === "unread" && !readNow.has(n.id);
            return (
              <button key={n.id} onClick={() => read(n)} className="flex w-full gap-3 px-4 py-3.5 text-left">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-canvas text-muted">
                  <Bell size={17} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className={cx("text-[15px]", unread ? "font-semibold" : "font-medium")}>{n.title}</span>
                    {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-brand" aria-label="Unread" />}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted">{n.message}</span>
                  <span className="mt-1 block text-xs text-subtle">{formatDate(n.createdAt)}</span>
                </span>
              </button>
            );
          })}
        </Card>
      )}

      {handled.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowHandled((s) => !s)}
            aria-expanded={showHandled}
            className="flex w-full items-center justify-between text-[13px] font-semibold uppercase tracking-wide text-muted"
          >
            Handled ({handled.length})
            <ChevronDown size={16} className={cx("transition-transform", showHandled && "rotate-180")} aria-hidden />
          </button>
          {showHandled && (
            <Card className="animate-fade-in mt-2 divide-y divide-line p-0">
              {handled.map(({ n, e }) => {
                const Icon = LIFE_COPY[e.type].icon;
                return (
                  <div key={n.id} className="flex items-center gap-3 px-4 py-3">
                    <Icon size={18} className="text-subtle" aria-hidden />
                    <div className="flex-1">
                      <p className="text-[15px] font-medium">{n.title}</p>
                      <p className="text-xs text-muted">{e.status === "confirmed" ? "You confirmed this" : "You said this wasn't right"}</p>
                    </div>
                    {e.status === "confirmed" && (
                      <Link href="/recommendations" className="flex items-center text-sm font-medium text-brand">
                        Suggestions <ChevronRight size={15} aria-hidden />
                      </Link>
                    )}
                  </div>
                );
              })}
            </Card>
          )}
        </div>
      )}
      {toast}
    </div>
  );
}
