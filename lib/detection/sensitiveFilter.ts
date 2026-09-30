// Privacy guard: health-related transactions are removed BEFORE signal
// extraction. They can still be shown in the customer's own transaction list,
// but they are never used as evidence for a life event.

import type { MerchantCategory, Transaction } from "@/lib/types";

export const SENSITIVE_CATEGORIES: ReadonlySet<MerchantCategory> = new Set<MerchantCategory>([
  "hospital",
  "pharmacy",
]);

export function filterSensitive(transactions: readonly Transaction[]): Transaction[] {
  return transactions.filter((t) => !SENSITIVE_CATEGORIES.has(t.merchantCategory));
}
