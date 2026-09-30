"use client";

// Reusable life-moment components. No event-specific code here: all copy comes
// from lib/client/lifeCopy.tsx and from the API (title/message/evidence).

import { ArrowRight, Check, ChevronDown, CircleCheck, ShieldCheck, Tag } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge, Button, ButtonLink, Card, cx } from "@/components/ui";
import { formatLikelihood } from "@/lib/client/format";
import { ACTION_COPY, LIFE_COPY } from "@/lib/client/lifeCopy";
import type { Evidence, LifeEvent, LifeEventType, Notification, Recommendation } from "@/lib/types";

// ---------------------------------------------------------------------------

export function KindLabel({ kind }: { kind: Recommendation["kind"] }) {
  return kind === "service" ? (
    <Badge tone="positive">
      <ShieldCheck size={12} aria-hidden /> Protects your existing contract
    </Badge>
  ) : (
    <Badge>
      <Tag size={12} aria-hidden /> Offer
    </Badge>
  );
}

/** Understated: words first, the number small and grey. */
export function ConfidenceMeter({ confidence }: { confidence: number }) {
  const sure = confidence >= 0.85;
  const filled = Math.max(1, Math.round(confidence * 5));
  return (
    <div className="flex items-center gap-2 text-xs text-muted" title="How likely we think this is">
      <span className="flex gap-0.5" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={cx("h-1.5 w-3 rounded-full", i < filled ? "bg-brand/60" : "bg-line")} />
        ))}
      </span>
      <span>{sure ? "We're fairly sure" : "We're not sure"}</span>
      <span className="tabular text-subtle">· {formatLikelihood(confidence)}</span>
    </div>
  );
}

export function EvidencePanel({ evidence, defaultOpen = false }: { evidence: Evidence[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [all, setAll] = useState(false);
  const sorted = [...evidence].sort((a, b) => b.likelihoodRatio - a.likelihoodRatio);
  const shown = all ? sorted : sorted.slice(0, 3);

  return (
    <div className="mt-3 rounded-xl bg-surface/70 ring-1 ring-brand/10">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-3.5 py-2.5 text-sm font-semibold text-ink"
      >
        Why am I seeing this?
        <ChevronDown size={16} className={cx("text-muted transition-transform duration-200", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div className="animate-fade-in px-3.5 pb-3.5">
          <p className="mb-2 text-sm text-muted">We noticed:</p>
          <ul className="flex flex-col gap-2">
            {shown.map((e) => (
              <li key={e.signal} className="flex gap-2 text-[15px] leading-snug">
                <Check size={16} className="mt-0.5 shrink-0 text-positive" strokeWidth={3} aria-hidden />
                {e.description}
              </li>
            ))}
          </ul>
          {sorted.length > 3 && (
            <button onClick={() => setAll((a) => !a)} className="mt-2 text-sm font-medium text-brand">
              {all ? "Show less" : `Show all (${sorted.length})`}
            </button>
          )}
          <div className="mt-3 border-t border-line pt-2.5 text-xs leading-relaxed text-muted">
            <p>We never use health-related payments for this.</p>
            <p>Nothing changes unless you confirm.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function ConfirmButtons({
  onConfirm,
  onDismiss,
  pending,
}: {
  onConfirm: () => void;
  onDismiss: () => void;
  pending: boolean;
}) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      <Button onClick={onConfirm} disabled={pending}>
        Yes, that&apos;s right
      </Button>
      <Button variant="secondary" onClick={onDismiss} disabled={pending}>
        No, that&apos;s not right
      </Button>
    </div>
  );
}

export function OutcomeMessage({ type, outcome }: { type: LifeEventType; outcome: "confirmed" | "dismissed" }) {
  const copy = LIFE_COPY[type];
  if (outcome === "dismissed") {
    return (
      <div className="animate-fade-in mt-3 rounded-xl bg-canvas px-3.5 py-3 text-sm text-muted">{copy.dismissedText}</div>
    );
  }
  return (
    <div className="animate-fade-in mt-3 rounded-xl bg-surface p-4 ring-1 ring-brand/10">
      <p className="text-lg font-semibold">{copy.confirmedTitle}</p>
      <p className="mt-1 text-sm text-muted">{copy.confirmedText}</p>
      <ButtonLink href="/recommendations" className="mt-3 w-full">
        See what might help <ArrowRight size={16} aria-hidden />
      </ButtonLink>
    </div>
  );
}

/** The life-moment question. Title and message come from the API; they always ask. */
export function LifeEventCard({
  notification,
  event,
  pending,
  justHandled,
  onConfirm,
  onDismiss,
}: {
  notification: Notification;
  event: LifeEvent;
  pending: boolean;
  justHandled: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  const Icon = LIFE_COPY[event.type].icon;
  return (
    <div className="animate-fade-in rounded-2xl bg-brand-tint p-4 ring-1 ring-brand/15">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-brand ring-1 ring-brand/15">
          <Icon size={18} aria-hidden />
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-brand">A moment that may matter</span>
      </div>
      <p className="mt-3 text-xl font-semibold leading-snug">{notification.title}</p>
      <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{notification.message}</p>
      <div className="mt-3">
        <ConfidenceMeter confidence={event.confidence} />
      </div>
      <EvidencePanel evidence={event.evidence} />
      {event.status === "detected" && <ConfirmButtons onConfirm={onConfirm} onDismiss={onDismiss} pending={pending} />}
      {event.status !== "detected" && justHandled && <OutcomeMessage type={event.type} outcome={event.status} />}
    </div>
  );
}

export function RecommendationCard({ rec, done }: { rec: Recommendation; done: boolean }) {
  const reassure = ACTION_COPY[rec.id]?.type === "reassure";
  return (
    <Card className={cx("animate-fade-in", reassure && "bg-positive-soft/60 ring-positive/20")}>
      <div className="flex gap-3">
        <span
          className={cx(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl",
            reassure ? "bg-positive text-white" : "bg-canvas",
          )}
          aria-hidden
        >
          {reassure ? <CircleCheck size={22} /> : rec.icon}
        </span>
        <div className="min-w-0 flex-1">
          <KindLabel kind={rec.kind} />
          <p className="mt-1.5 font-semibold leading-snug">{rec.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{rec.description}</p>
          {done ? (
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-positive">
              <CircleCheck size={16} aria-hidden /> Done
            </p>
          ) : (
            <Link
              href={`/apply/${encodeURIComponent(rec.id)}`}
              className={cx(
                "mt-3 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                rec.kind === "service" ? "bg-brand text-white hover:bg-brand-dark" : "bg-surface text-ink ring-1 ring-line hover:bg-canvas",
              )}
            >
              {rec.actionLabel} <ArrowRight size={15} aria-hidden />
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}
