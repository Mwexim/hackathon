"use client";

// Person 3 owns this screen. Fake application flow — nothing is submitted anywhere.
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Card, LoadState, PageTitle, Placeholder } from "@/components/Card";
import { getRecommendations } from "@/lib/client/api";
import { useApi } from "@/lib/client/useApi";

export default function ApplyPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error } = useApi(getRecommendations);
  const [done, setDone] = useState(false);

  // Only recommendations the server returned for this customer can be opened.
  const rec = data?.flatMap((g) => g.recommendations).find((r) => r.id === id);

  return (
    <>
      <PageTitle title="Apply" />
      <LoadState loading={loading} error={error} />
      {data && !rec && (
        <Card>
          <p className="text-sm text-muted">This suggestion is not available.</p>
          <Link href="/recommendations" className="mt-2 inline-block text-sm text-brand">
            Back to suggestions
          </Link>
        </Card>
      )}
      {rec && (
        <Card>
          <p className="text-2xl">{rec.icon}</p>
          <p className="mt-2 font-semibold">{rec.title}</p>
          <p className="mt-1 text-sm text-muted">{rec.description}</p>
          {done ? (
            <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
              Done! (Demo — nothing was actually sent.)
            </p>
          ) : (
            <button
              onClick={() => setDone(true)}
              className="mt-4 w-full rounded-full bg-brand py-2.5 text-sm font-medium text-white"
            >
              {rec.actionLabel}
            </button>
          )}
        </Card>
      )}
      <Placeholder owner="Person 3" />
    </>
  );
}
