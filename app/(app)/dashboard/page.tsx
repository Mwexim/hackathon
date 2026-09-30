"use client";

import { ChevronRight, CreditCard, PiggyBank, Sparkles, Wallet } from "lucide-react";
import Link from "next/link";
import { TransactionRow } from "@/components/TransactionRow";
import { Amount, Card, ErrorState, SectionTitle, Skeleton } from "@/components/ui";
import { getAccounts, getCustomer, getNotifications, getRecommendations, getTransactions } from "@/lib/client/api";
import { useApi } from "@/lib/client/useApi";
import type { Account } from "@/lib/types";

const ACCOUNT_ICON = { current: Wallet, savings: PiggyBank, credit_card: CreditCard } as const;

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function DashboardPage() {
  const { data, loading, error, reload } = useApi(async () => {
    const [customer, accounts, notifications, transactions, recommendations] = await Promise.all([
      getCustomer(),
      getAccounts(),
      getNotifications(),
      getTransactions(5),
      getRecommendations(),
    ]);
    return { customer, accounts, notifications, transactions, recommendations };
  });

  if (error) return <ErrorState onRetry={reload} />;
  if (loading || !data) return <DashboardSkeleton />;

  const total = data.accounts.filter((a) => a.type !== "credit_card").reduce((s, a) => s + a.balance, 0);
  const lifeMoment = data.notifications.find((n) => n.kind === "life_event" && n.status === "unread");
  const openActions = data.recommendations.reduce(
    (n, g) => n + g.recommendations.filter((r) => r.kind === "service" && !g.completedActionIds.includes(r.id)).length,
    0,
  );

  return (
    <div className="animate-fade-in">
      <p className="text-sm text-muted">{greeting()},</p>
      <h1 className="text-2xl font-semibold tracking-tight">{data.customer.name}</h1>

      {lifeMoment && (
        <Link href="/notifications" className="mt-4 block">
          <div className="rounded-2xl bg-brand-tint p-4 ring-1 ring-brand/15 transition hover:ring-brand/30">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-brand ring-1 ring-brand/15">
                <Sparkles size={18} aria-hidden />
              </span>
              <div className="flex-1">
                <p className="font-semibold leading-snug">Something may have changed — we&apos;d like to check with you</p>
                <p className="mt-1 text-sm text-muted">It only takes a moment. Nothing changes unless you say so.</p>
                <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-brand px-3.5 py-1.5 text-sm font-semibold text-white">
                  Take a look <ChevronRight size={15} aria-hidden />
                </span>
              </div>
            </div>
          </div>
        </Link>
      )}

      {!lifeMoment && openActions > 0 && (
        <Link href="/recommendations" className="mt-4 block">
          <Card className="flex items-center gap-3 transition hover:ring-brand/30">
            <Sparkles size={18} className="text-brand" aria-hidden />
            <p className="flex-1 text-sm font-medium">You have {openActions} suggested step{openActions > 1 ? "s" : ""} to protect your contracts</p>
            <ChevronRight size={16} className="text-subtle" aria-hidden />
          </Card>
        </Link>
      )}

      <Card className="mt-4 bg-ink text-white ring-0">
        <p className="text-sm text-white/70">Total balance</p>
        <p className="tabular mt-0.5 text-3xl font-semibold tracking-tight">
          <Amount value={total} />
        </p>
        <p className="mt-1 text-xs text-white/60">Current and savings accounts</p>
      </Card>

      <SectionTitle action={<Link href="/accounts" className="text-sm font-medium text-brand">All accounts</Link>}>
        Accounts
      </SectionTitle>
      <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
        {data.accounts.map((a) => (
          <AccountTile key={a.id} account={a} />
        ))}
      </div>

      <SectionTitle action={<Link href="/transactions" className="text-sm font-medium text-brand">See all</Link>}>
        Recent transactions
      </SectionTitle>
      <Card className="divide-y divide-line p-0">
        {data.transactions.map((t) => (
          <TransactionRow key={t.id} tx={t} />
        ))}
      </Card>
    </div>
  );
}

function AccountTile({ account }: { account: Account }) {
  const Icon = ACCOUNT_ICON[account.type];
  return (
    <Link href={`/accounts?id=${encodeURIComponent(account.id)}`} className="w-44 shrink-0 snap-start">
      <Card className="h-full transition hover:ring-brand/30">
        <Icon size={20} className="text-brand" aria-hidden />
        <p className="mt-3 text-sm text-muted">{account.name}</p>
        <p className={`tabular text-lg font-semibold ${account.balance < 0 ? "text-brand" : ""}`}>
          <Amount value={account.balance} />
        </p>
      </Card>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-2 h-7 w-40" />
      <Skeleton className="mt-5 h-28" />
      <div className="mt-6 flex gap-3">
        <Skeleton className="h-28 w-44" />
        <Skeleton className="h-28 w-44" />
      </div>
      <Skeleton className="mt-6 h-56" />
    </div>
  );
}
