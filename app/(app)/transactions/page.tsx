"use client";

// Person 2 owns this screen.
import { Card, LoadState, PageTitle, Placeholder } from "@/components/Card";
import { getTransactions } from "@/lib/client/api";
import { formatDate, formatEUR } from "@/lib/client/format";
import { useApi } from "@/lib/client/useApi";

export default function TransactionsPage() {
  const { data, loading, error } = useApi(() => getTransactions(50));

  return (
    <>
      <PageTitle title="Transactions" subtitle="Your 50 most recent transactions" />
      <LoadState loading={loading} error={error} />
      {data && (
        <Card className="divide-y divide-line p-0">
          {data.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{t.description}</p>
                <p className="text-xs text-muted">
                  {formatDate(t.date)}
                  {t.foreign ? " · abroad" : ""}
                  {t.recurring ? " · recurring" : ""}
                </p>
              </div>
              <p className={`text-sm font-semibold ${t.direction === "in" ? "text-emerald-600" : ""}`}>
                {t.direction === "in" ? "+" : "−"}
                {formatEUR(t.amount)}
              </p>
            </div>
          ))}
        </Card>
      )}
      <Placeholder owner="Person 2" />
    </>
  );
}
