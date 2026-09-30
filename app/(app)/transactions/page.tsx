"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { TransactionRow } from "@/components/TransactionRow";
import { Card, EmptyState, ErrorState, PageTitle, SkeletonList, cx } from "@/components/ui";
import { getTransactions } from "@/lib/client/api";
import { CATEGORY_META } from "@/lib/client/categories";
import { formatMonth } from "@/lib/client/format";
import { useApi } from "@/lib/client/useApi";
import type { Transaction } from "@/lib/types";

export default function TransactionsPage() {
  const { data, loading, error, reload } = useApi(() => getTransactions(200));
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");

  const labels = useMemo(
    () => (data ? [...new Set(data.map((t) => CATEGORY_META[t.merchantCategory].label))].sort() : []),
    [data],
  );

  const groups = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    const filtered = data.filter(
      (t) =>
        (category === "all" || CATEGORY_META[t.merchantCategory].label === category) &&
        (!q || t.description.toLowerCase().includes(q)),
    );
    const byMonth = new Map<string, Transaction[]>();
    for (const t of filtered) byMonth.set(t.date.slice(0, 7), [...(byMonth.get(t.date.slice(0, 7)) ?? []), t]);
    return [...byMonth.entries()];
  }, [data, category, query]);

  return (
    <div className="animate-fade-in">
      <PageTitle title="Payments" />
      <label className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5 ring-1 ring-line focus-within:ring-brand/50">
        <Search size={16} className="text-subtle" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value.slice(0, 60))}
          placeholder="Search payments"
          className="w-full bg-transparent text-sm outline-none placeholder:text-subtle"
          aria-label="Search payments"
        />
      </label>

      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {["all", ...labels].map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cx(
              "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 transition-colors",
              category === c ? "bg-ink text-white ring-ink" : "bg-surface text-muted ring-line hover:text-ink",
            )}
          >
            {c === "all" ? "All" : c}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {error && <ErrorState onRetry={reload} />}
        {loading && !data && <SkeletonList rows={6} />}
        {data && groups.length === 0 && <EmptyState icon={<Search size={28} />} title="No payments found">Try another search or category.</EmptyState>}
        {groups.map(([month, txs]) => (
          <section key={month} className="mb-5">
            <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted">{formatMonth(month + "-01")}</h2>
            <Card className="divide-y divide-line p-0">
              {txs.map((t) => (
                <TransactionRow key={t.id} tx={t} />
              ))}
            </Card>
          </section>
        ))}
      </div>
    </div>
  );
}
