"use client";

import { Info, Sparkles } from "lucide-react";
import Link from "next/link";
import { RecommendationCard } from "@/components/life";
import { ButtonLink, EmptyState, ErrorState, PageTitle, SectionTitle, SkeletonList } from "@/components/ui";
import { getRecommendations } from "@/lib/client/api";
import { LIFE_COPY } from "@/lib/client/lifeCopy";
import { useApi } from "@/lib/client/useApi";

export default function RecommendationsPage() {
  const { data, loading, error, reload } = useApi(getRecommendations);

  if (error) return <ErrorState onRetry={reload} />;
  if (loading || !data) return <SkeletonList rows={3} />;

  if (data.length === 0) {
    return (
      <div className="animate-fade-in">
        <PageTitle title="Suggestions for you" />
        <EmptyState icon={<Sparkles size={28} />} title="Nothing here yet">
          <p>Suggestions only appear after you confirm a moment in your inbox.</p>
          <ButtonLink href="/notifications" variant="secondary" className="mt-4">
            Go to inbox
          </ButtonLink>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageTitle title="Suggestions for you" subtitle="Based on what you confirmed." />
      {data.map((g) => {
        const service = g.recommendations.filter((r) => r.kind === "service");
        const commercial = g.recommendations.filter((r) => r.kind === "commercial");
        const Icon = LIFE_COPY[g.eventType].icon;
        return (
          <section key={g.eventId} className="mb-8">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand">
              <Icon size={16} aria-hidden /> {LIFE_COPY[g.eventType].label.replace("?", "")}
            </div>

            {service.length > 0 && (
              <>
                <SectionTitle>First, let&apos;s make sure you&apos;re protected</SectionTitle>
                <div className="flex flex-col gap-3">
                  {service.map((r) => (
                    <RecommendationCard key={r.id} rec={r} done={g.completedActionIds.includes(r.id)} />
                  ))}
                </div>
              </>
            )}

            {commercial.length > 0 ? (
              <>
                <SectionTitle>You might also find this useful</SectionTitle>
                <div className="flex flex-col gap-3">
                  {commercial.map((r) => (
                    <RecommendationCard key={r.id} rec={r} done={g.completedActionIds.includes(r.id)} />
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-4 flex gap-2 rounded-xl bg-surface px-3.5 py-3 text-sm text-muted ring-1 ring-line">
                <Info size={16} className="mt-0.5 shrink-0" aria-hidden />
                <span>
                  Based on your settings, we only show things that protect your current contracts.{" "}
                  <Link href="/settings" className="font-medium text-brand">
                    Change settings
                  </Link>
                </span>
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
