import { Globe } from "lucide-react";
import { Amount, Badge } from "@/components/ui";
import { CategoryIcon } from "@/lib/client/categories";
import { formatDayMonth } from "@/lib/client/format";
import type { Transaction } from "@/lib/types";

export function TransactionRow({ tx }: { tx: Transaction }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <CategoryIcon category={tx.merchantCategory} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-[15px] font-medium">
          {tx.description}
          {tx.foreign && <Globe size={13} className="shrink-0 text-subtle" aria-label="Payment abroad" />}
        </p>
        <p className="flex items-center gap-1.5 text-xs text-muted">
          {formatDayMonth(tx.date)}
          {tx.recurring && <Badge>Recurring</Badge>}
        </p>
      </div>
      <Amount value={tx.amount} direction={tx.direction} className="text-[15px] font-semibold" />
    </div>
  );
}
