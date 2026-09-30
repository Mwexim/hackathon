"use client";

// Person 2 owns this screen.
import { Card, LoadState, PageTitle, Placeholder } from "@/components/Card";
import { getAccounts } from "@/lib/client/api";
import { formatEUR } from "@/lib/client/format";
import { useApi } from "@/lib/client/useApi";

const TYPE_LABEL = { current: "Current", savings: "Savings", credit_card: "Credit card" } as const;

export default function AccountsPage() {
  const { data, loading, error } = useApi(getAccounts);

  return (
    <>
      <PageTitle title="Accounts" />
      <LoadState loading={loading} error={error} />
      <div className="flex flex-col gap-3">
        {data?.map((a) => (
          <Card key={a.id} className="flex items-center justify-between">
            <div>
              <p className="font-medium">{a.name}</p>
              <p className="text-xs text-muted">{TYPE_LABEL[a.type]}</p>
            </div>
            <p className={`font-semibold ${a.balance < 0 ? "text-brand" : ""}`}>{formatEUR(a.balance)}</p>
          </Card>
        ))}
      </div>
      <Placeholder owner="Person 2" />
    </>
  );
}
