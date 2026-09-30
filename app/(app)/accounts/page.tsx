"use client";

import { ArrowLeft, ChevronRight, CreditCard, PiggyBank, Wallet } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { TransactionRow } from "@/components/TransactionRow";
import { Amount, Card, EmptyState, ErrorState, PageTitle, SkeletonList } from "@/components/ui";
import { getAccounts, getTransactions } from "@/lib/client/api";
import { useApi } from "@/lib/client/useApi";

const TYPE = {
  current: { label: "Current account", icon: Wallet },
  savings: { label: "Savings account", icon: PiggyBank },
  credit_card: { label: "Credit card", icon: CreditCard },
} as const;

export default function AccountsPage() {
  return (
    <Suspense fallback={<SkeletonList />}>
      <Accounts />
    </Suspense>
  );
}

function Accounts() {
  const router = useRouter();
  const selectedId = useSearchParams().get("id");
  const { data, loading, error, reload } = useApi(async () => {
    const [accounts, transactions] = await Promise.all([getAccounts(), getTransactions(200)]);
    return { accounts, transactions };
  });

  if (error) return <ErrorState onRetry={reload} />;
  if (loading || !data) return <SkeletonList />;

  // Only accounts returned for this session can be selected.
  const selected = data.accounts.find((a) => a.id === selectedId);

  if (selected) {
    const txs = data.transactions.filter((t) => t.accountId === selected.id);
    const Icon = TYPE[selected.type].icon;
    return (
      <div className="animate-fade-in">
        <button onClick={() => router.push("/accounts")} className="mb-4 flex items-center gap-1 text-sm font-medium text-brand">
          <ArrowLeft size={16} aria-hidden /> Accounts
        </button>
        <Card>
          <Icon size={22} className="text-brand" aria-hidden />
          <p className="mt-3 text-sm text-muted">{selected.name}</p>
          <p className={`tabular text-3xl font-semibold ${selected.balance < 0 ? "text-brand" : ""}`}>
            <Amount value={selected.balance} />
          </p>
        </Card>
        <h2 className="mb-2 mt-6 text-[13px] font-semibold uppercase tracking-wide text-muted">Transactions</h2>
        {txs.length === 0 ? (
          <EmptyState title="No transactions yet" />
        ) : (
          <Card className="divide-y divide-line p-0">
            {txs.map((t) => (
              <TransactionRow key={t.id} tx={t} />
            ))}
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageTitle title="Accounts" />
      {data.accounts.length === 0 ? (
        <EmptyState title="No accounts" />
      ) : (
        <div className="flex flex-col gap-3">
          {data.accounts.map((a) => {
            const Icon = TYPE[a.type].icon;
            return (
              <button key={a.id} onClick={() => router.push(`/accounts?id=${encodeURIComponent(a.id)}`)} className="text-left">
                <Card className="flex items-center gap-3 transition hover:ring-brand/30">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-brand">
                    <Icon size={20} aria-hidden />
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold">{a.name}</p>
                    <p className="text-xs text-muted">{TYPE[a.type].label}</p>
                  </div>
                  <Amount value={a.balance} className={`font-semibold ${a.balance < 0 ? "text-brand" : ""}`} />
                  <ChevronRight size={16} className="text-subtle" aria-hidden />
                </Card>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
