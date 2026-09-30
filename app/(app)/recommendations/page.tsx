"use client";

// Person 3 owns this screen.
import Link from "next/link";
import { Card, LoadState, PageTitle, Placeholder } from "@/components/Card";
import { getRecommendations } from "@/lib/client/api";
import { EVENT_LABELS } from "@/lib/client/format";
import { useApi } from "@/lib/client/useApi";

export default function RecommendationsPage() {
  const { data, loading, error } = useApi(getRecommendations);

  return (
    <>
      <PageTitle title="Suggestions for you" subtitle="Based on what you confirmed" />
      <LoadState loading={loading} error={error} />
      {data?.length === 0 && (
        <Card>
          <p className="text-sm text-muted">
            Nothing here yet. Suggestions only appear after you confirm a life moment in your notifications.
          </p>
        </Card>
      )}
      <div className="flex flex-col gap-5">
        {data?.map((g) => (
          <section key={g.eventId}>
            <h2 className="mb-2 text-sm font-semibold text-muted">{EVENT_LABELS[g.eventType]}</h2>
            <div className="flex flex-col gap-3">
              {g.recommendations.map((r) => (
                <Card key={r.id}>
                  <div className="flex gap-3">
                    <span className="text-2xl" aria-hidden>
                      {r.icon}
                    </span>
                    <div className="flex-1">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                        {r.kind === "service" ? "Protect what you have" : "Suggestion"}
                      </p>
                      <p className="font-medium">{r.title}</p>
                      <p className="mt-1 text-sm text-muted">{r.description}</p>
                      <Link
                        href={`/apply/${encodeURIComponent(r.id)}`}
                        className="mt-3 inline-block rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-white"
                      >
                        {r.actionLabel}
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
      <Placeholder owner="Person 3" />
    </>
  );
}
