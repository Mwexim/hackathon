// Signal extraction. Pure functions: data in, present signals out.
// extractSignals() ALWAYS runs sensitiveFilter first, so no signal function ever
// sees health-related transactions.

import type {
  AppBehaviour,
  Customer,
  InsurancePolicy,
  LifeEventType,
  MerchantCategory,
  Transaction,
} from "@/lib/types";
import { LOOKBACK_DAYS, SIGNAL_PARAMS } from "./config";
import { filterSensitive } from "./sensitiveFilter";

export type DetectionInput = {
  customer: Customer;
  transactions: Transaction[];
  policies: InsurancePolicy[];
  behaviour: AppBehaviour[];
  today: string; // YYYY-MM-DD
};

export type PresentSignal = {
  eventType: LifeEventType;
  signal: string; // key in EVENT_CONFIG[eventType].signals
  description: string; // plain language, shown to the customer
};

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;
const toMs = (date: string) => Date.parse(date.slice(0, 10) + "T00:00:00Z");
export const daysAgo = (today: string, date: string) => Math.round((toMs(today) - toMs(date)) / DAY_MS);
export const inWindow = (today: string, date: string) => {
  const age = daysAgo(today, date);
  return age >= 0 && age < LOOKBACK_DAYS;
};
const monthName = (date: string) =>
  new Date(toMs(date)).toLocaleString("en-GB", { month: "long", timeZone: "UTC" });

/** 30-day bucket counted back from today (0 = last 30 days), or -1 outside the window. */
const bucketOf = (today: string, date: string) =>
  inWindow(today, date) ? Math.floor(daysAgo(today, date) / 30) : -1;
const BUCKETS = Math.ceil(LOOKBACK_DAYS / 30);

const hasHistoryBeforeWindow = (txs: Transaction[], today: string) =>
  txs.some((t) => daysAgo(today, t.date) >= LOOKBACK_DAYS);

// ---------------------------------------------------------------------------
// Generic, testable signal functions
// ---------------------------------------------------------------------------

export type RecurringSeries = {
  counterpartyId: string;
  category: MerchantCategory;
  direction: "in" | "out";
  firstDate: string;
  lastDate: string;
  count: number;
  medianAmount: number;
};

/** Same counterparty, roughly monthly, similar amount (at least 2 payments). */
export function detectRecurringPayments(txs: Transaction[]): RecurringSeries[] {
  const byCp = new Map<string, Transaction[]>();
  for (const t of txs) {
    const key = `${t.counterpartyId}|${t.direction}`;
    byCp.set(key, [...(byCp.get(key) ?? []), t]);
  }
  const series: RecurringSeries[] = [];
  for (const list of byCp.values()) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    const amounts = sorted.map((t) => t.amount).sort((a, b) => a - b);
    const median = amounts[Math.floor(amounts.length / 2)];
    const similar = sorted.every(
      (t) => Math.abs(t.amount - median) <= median * SIGNAL_PARAMS.recurringAmountTolerance,
    );
    const monthly = sorted.slice(1).every((t, i) => {
      const gap = daysAgo(t.date, sorted[i].date);
      return gap >= SIGNAL_PARAMS.recurringMinDays && gap <= SIGNAL_PARAMS.recurringMaxDays;
    });
    if (!similar || !monthly) continue;
    series.push({
      counterpartyId: sorted[0].counterpartyId,
      category: sorted[0].merchantCategory,
      direction: sorted[0].direction,
      firstDate: sorted[0].date,
      lastDate: sorted[sorted.length - 1].date,
      count: sorted.length,
      medianAmount: median,
    });
  }
  return series;
}

/** A recurring series in this category that started inside the window (and we have older history). */
export function detectNewRecurring(
  txs: Transaction[],
  today: string,
  category: MerchantCategory,
  direction: "in" | "out" = "out",
): RecurringSeries | null {
  if (!hasHistoryBeforeWindow(txs, today)) return null;
  return (
    detectRecurringPayments(txs).find(
      (s) => s.category === category && s.direction === direction && inWindow(today, s.firstDate),
    ) ?? null
  );
}

/** A recurring series in this category whose last payment is more than `stoppedAfterDays` ago. */
export function detectStoppedRecurring(
  txs: Transaction[],
  today: string,
  category: MerchantCategory,
): RecurringSeries | null {
  return (
    detectRecurringPayments(txs).find(
      (s) =>
        s.category === category &&
        s.direction === "out" &&
        daysAgo(today, s.lastDate) > SIGNAL_PARAMS.stoppedAfterDays,
    ) ?? null
  );
}

/** First payment (inside the window) to a counterparty in this category we have never seen before. */
export function detectFirstPaymentInCategory(
  txs: Transaction[],
  today: string,
  category: MerchantCategory,
  direction: "in" | "out" = "out",
): Transaction | null {
  const relevant = txs
    .filter((t) => t.merchantCategory === category && t.direction === direction)
    .sort((a, b) => a.date.localeCompare(b.date));
  const seenBefore = new Set(relevant.filter((t) => !inWindow(today, t.date)).map((t) => t.counterpartyId));
  const needsHistory = category === "utilities"; // a "new" provider only means something with history
  if (needsHistory && !hasHistoryBeforeWindow(txs, today)) return null;
  return relevant.find((t) => inWindow(today, t.date) && !seenBefore.has(t.counterpartyId)) ?? null;
}

/** Sum and count per 30-day bucket for one category (index 0 = last 30 days). */
export function detectMonthlySpend(
  txs: Transaction[],
  today: string,
  category: MerchantCategory,
): { sum: number; count: number }[] {
  const buckets = Array.from({ length: BUCKETS }, () => ({ sum: 0, count: 0 }));
  for (const t of txs) {
    if (t.merchantCategory !== category || t.direction !== "out") continue;
    const b = bucketOf(today, t.date);
    if (b < 0) continue;
    buckets[b].sum += t.amount;
    buckets[b].count += 1;
  }
  return buckets;
}

/** Card payments abroad inside the window. */
export function detectForeignPayments(txs: Transaction[], today: string): Transaction[] {
  return txs.filter((t) => t.foreign && t.direction === "out" && inWindow(today, t.date));
}

/** A Kate question or search inside the window matching the pattern. */
export function detectAppIntent(
  behaviour: AppBehaviour[],
  today: string,
  pattern: RegExp = SIGNAL_PARAMS.addressIntentPattern,
): AppBehaviour | null {
  return (
    behaviour.find(
      (b) =>
        (b.type === "kate_question" || b.type === "search") &&
        inWindow(today, b.timestamp) &&
        pattern.test(b.value),
    ) ?? null
  );
}

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** customer.address differs from the home policy's insuredAddress. */
export function detectInsuredAddressOutdated(customer: Customer, policies: InsurancePolicy[]): boolean {
  const home = policies.find((p) => p.type === "home" && p.insuredAddress);
  return !!home && normalise(home.insuredAddress!) !== normalise(customer.address);
}

/** family_liability covers fewer people than the household implied by the signals. */
export function detectHouseholdMismatch(
  customer: Customer,
  policies: InsurancePolicy[],
  childSignalsPresent: boolean,
): InsurancePolicy | null {
  const family = policies.find((p) => p.type === "family_liability");
  if (!family) return null;
  const registered = { single: 1, couple: 2, family: 3 }[customer.householdType];
  const implied = registered + (childSignalsPresent ? 1 : 0);
  return family.coveredHouseholdMembers < implied ? family : null;
}

// ---------------------------------------------------------------------------
// Per life event
// ---------------------------------------------------------------------------

function movedHouse({ customer, transactions: txs, policies, behaviour, today }: DetectionInput): PresentSignal[] {
  const out: PresentSignal[] = [];
  const add = (signal: string, description: string) => out.push({ eventType: "moved_house", signal, description });

  if (detectInsuredAddressOutdated(customer, policies)) {
    add("insured_address_outdated", "The address on your home insurance differs from the address we have for you");
  }
  const newRent = detectNewRecurring(txs, today, "rent");
  if (newRent) add("new_rent", `A new monthly rent payment started in ${monthName(newRent.firstDate)}`);

  const stoppedRent = detectStoppedRecurring(txs, today, "rent");
  if (stoppedRent) add("old_rent_stopped", `Your previous monthly rent payment stopped after ${monthName(stoppedRent.lastDate)}`);

  const utility = detectFirstPaymentInCategory(txs, today, "utilities");
  if (utility) add("new_utility_provider", `A first payment to a new energy provider in ${monthName(utility.date)}`);

  const mover = detectFirstPaymentInCategory(txs, today, "moving");
  if (mover) add("moving_company", `A payment to a moving company in ${monthName(mover.date)}`);

  if (detectAppIntent(behaviour, today)) add("address_intent", "You asked in the app how to change your address");

  const furniture = txs.find(
    (t) =>
      t.merchantCategory === "furniture" &&
      t.direction === "out" &&
      t.amount >= SIGNAL_PARAMS.largeFurnitureMinAmount &&
      inWindow(today, t.date),
  );
  if (furniture) add("large_furniture", `A larger furniture purchase in ${monthName(furniture.date)}`);

  return out;
}

function newBaby({ customer, transactions: txs, policies, today }: DetectionInput): PresentSignal[] {
  const out: PresentSignal[] = [];
  const add = (signal: string, description: string) => out.push({ eventType: "new_baby", signal, description });

  const childcare = detectNewRecurring(txs, today, "childcare");
  if (childcare) add("new_childcare_payment", `A new monthly payment to a childcare provider started in ${monthName(childcare.firstDate)}`);

  const benefit = detectFirstPaymentInCategory(txs, today, "child_benefit", "in");
  if (benefit) add("child_benefit_income", `You started receiving child benefit in ${monthName(benefit.date)}`);

  const monthsOver = detectMonthlySpend(txs, today, "baby").filter(
    (b) => b.sum >= SIGNAL_PARAMS.babySpendingPerMonth,
  ).length;
  if (monthsOver >= SIGNAL_PARAMS.babySpendingMinMonths) {
    add("baby_spending_150", "Regular spending at baby stores over the last few months");
  }

  const mismatch = detectHouseholdMismatch(customer, policies, !!childcare || !!benefit);
  if (mismatch) {
    add("household_mismatch", `Your family insurance covers ${mismatch.coveredHouseholdMembers} people, which may no longer be everyone at home`);
  }
  return out;
}

function frequentTraveller({ transactions: txs, today }: DetectionInput): PresentSignal[] {
  const out: PresentSignal[] = [];
  const add = (signal: string, description: string) => out.push({ eventType: "frequent_traveller", signal, description });

  const busyMonths = detectMonthlySpend(txs, today, "travel").filter(
    (b) => b.count >= SIGNAL_PARAMS.travelPerMonth,
  ).length;
  if (busyMonths >= 1) add("travel_3_per_month", "Three or more travel bookings within a single month");
  if (busyMonths >= SIGNAL_PARAMS.travelRepeatedMonths) {
    add("repeated_2_months", `Frequent travel bookings in ${busyMonths} of the last 3 months`);
  }
  if (detectForeignPayments(txs, today).length >= SIGNAL_PARAMS.foreignPaymentsMin) {
    add("foreign_card_payments", "Several card payments abroad");
  }
  return out;
}

// ---------------------------------------------------------------------------

export const SIGNAL_EXTRACTORS: Record<LifeEventType, (input: DetectionInput) => PresentSignal[]> = {
  moved_house: movedHouse,
  new_baby: newBaby,
  frequent_traveller: frequentTraveller,
};

/** Runs the sensitive filter, then every extractor. */
export function extractSignals(input: DetectionInput): PresentSignal[] {
  const safe: DetectionInput = { ...input, transactions: filterSensitive(input.transactions) };
  return Object.values(SIGNAL_EXTRACTORS).flatMap((fn) => fn(safe));
}
