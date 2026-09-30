"use client";

import { ArrowLeft, ArrowRight, Check, CircleCheck } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { KindLabel } from "@/components/life";
import { Badge, Button, ButtonLink, Card, EmptyState, ErrorState, SkeletonList } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { completeAction, getCustomer, getPolicies, getRecommendations } from "@/lib/client/api";
import { ACTION_COPY } from "@/lib/client/lifeCopy";
import { useApi } from "@/lib/client/useApi";

export default function ApplyPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, reload } = useApi(async () => {
    const [groups, customer, policies] = await Promise.all([getRecommendations(), getCustomer(), getPolicies()]);
    return { groups, customer, policies };
  });
  const [pending, setPending] = useState(false);
  const [doneNow, setDoneNow] = useState(false);
  const { toast, showToast } = useToast();

  if (error) return <ErrorState onRetry={reload} />;
  if (loading || !data) return <SkeletonList rows={2} />;

  // Only recommendations the server offers THIS customer can be opened.
  const group = data.groups.find((g) => g.recommendations.some((r) => r.id === id));
  const rec = group?.recommendations.find((r) => r.id === id);
  const copy = rec ? ACTION_COPY[rec.id] : undefined;

  if (!group || !rec || !copy) {
    return (
      <EmptyState title="This suggestion is not available">
        <ButtonLink href="/recommendations" variant="secondary" className="mt-4">
          Back to suggestions
        </ButtonLink>
      </EmptyState>
    );
  }

  const alreadyDone = group.completedActionIds.includes(rec.id);
  const summary = copy.type === "change" ? copy.summary({ customer: data.customer, policies: data.policies }) : null;

  async function onConfirm() {
    setPending(true);
    try {
      await completeAction(rec!.id);
      setDoneNow(true);
    } catch {
      showToast("That didn't work. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <Link href="/recommendations" className="mb-4 flex items-center gap-1 text-sm font-medium text-brand">
        <ArrowLeft size={16} aria-hidden /> Suggestions
      </Link>

      {doneNow || alreadyDone ? (
        <Card className="flex flex-col items-center px-6 py-10 text-center">
          <span className="animate-pop flex h-16 w-16 items-center justify-center rounded-full bg-positive text-white">
            <Check size={34} strokeWidth={3} aria-hidden />
          </span>
          <p className="mt-5 text-xl font-semibold leading-snug">
            {doneNow ? copy.successText : "Already done"}
          </p>
          {copy.type === "offer" && <p className="mt-2 text-sm text-muted">Demo — no real product is opened.</p>}
          <ButtonLink href="/recommendations" variant="secondary" className="mt-6">
            Back to suggestions
          </ButtonLink>
        </Card>
      ) : (
        <Card className="p-5">
          <KindLabel kind={rec.kind} />
          <h1 className="mt-2 text-xl font-semibold leading-snug">{rec.title}</h1>
          <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{rec.description}</p>

          {copy.type === "change" && summary && (
            <div className="mt-5 rounded-xl bg-canvas p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{summary.label}</p>
              <div className="mt-2 flex flex-col gap-1.5">
                <p className="text-[15px] text-muted line-through decoration-subtle">{summary.from}</p>
                <p className="flex items-center gap-2 text-[15px] font-semibold">
                  <ArrowRight size={16} className="text-brand" aria-hidden /> {summary.to}
                </p>
              </div>
            </div>
          )}

          {copy.type === "reassure" && (
            <div className="mt-5 rounded-xl bg-positive-soft p-4">
              <p className="flex items-center gap-2 font-semibold text-positive">
                <CircleCheck size={18} aria-hidden /> Your card&apos;s travel cover includes
              </p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {copy.details.map((d) => (
                  <li key={d} className="flex gap-2 text-[15px]">
                    <Check size={16} className="mt-0.5 shrink-0 text-positive" strokeWidth={3} aria-hidden /> {d}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-muted">No need to buy anything extra.</p>
            </div>
          )}

          {copy.type === "offer" && (
            <div className="mt-5 rounded-xl bg-canvas p-4">
              <p className="font-semibold">{copy.headline}</p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {copy.points.map((p) => (
                  <li key={p} className="flex gap-2 text-[15px] text-muted">
                    <Check size={16} className="mt-0.5 shrink-0" aria-hidden /> {p}
                  </li>
                ))}
              </ul>
              <Badge tone="info" className="mt-3">
                Demo — no real product is opened
              </Badge>
            </div>
          )}

          <Button onClick={onConfirm} disabled={pending} className="mt-6 w-full py-3 text-[15px]">
            {pending ? "One moment…" : copy.confirmLabel}
          </Button>
          {copy.type === "change" && (
            <p className="mt-3 text-center text-xs text-muted">Only this change is made. Nothing else on your contract changes.</p>
          )}
        </Card>
      )}
      {toast}
    </div>
  );
}
