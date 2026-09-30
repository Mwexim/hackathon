"use client";

// Person 2 owns this screen.
import Link from "next/link";
import { Card, LoadState, PageTitle, Placeholder } from "@/components/Card";
import { getAccounts, getNotifications } from "@/lib/client/api";
import { formatEUR } from "@/lib/client/format";
import { useApi } from "@/lib/client/useApi";

export default function DashboardPage() {
  const { data, loading, error } = useApi(async () => {
    const [accounts, notifications] = await Promise.all([getAccounts(), getNotifications()]);
    return { accounts, notifications };
  });

  const question = data?.notifications.find((n) => n.kind === "life_event" && n.status === "unread");

  return (
    <>
      <PageTitle title="Home" />
      <LoadState loading={loading} error={error} />
      {data && (
        <div className="flex flex-col gap-3">
          {question && (
            <Link href="/notifications">
              <Card className="border-l-4 border-brand">
                <p className="text-xs font-medium uppercase tracking-wide text-brand">A quick question</p>
                <p className="mt-1 font-medium">{question.title}</p>
              </Card>
            </Link>
          )}
          {data.accounts.map((a) => (
            <Card key={a.id}>
              <p className="text-sm text-muted">{a.name}</p>
              <p className="text-xl font-semibold">{formatEUR(a.balance)}</p>
            </Card>
          ))}
          <Link href="/recommendations" className="text-sm font-medium text-brand">
            See suggestions for you ›
          </Link>
        </div>
      )}
      <Placeholder owner="Person 2" />
    </>
  );
}
