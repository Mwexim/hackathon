// Signal extraction. Pure functions: data in, present signals out.
// Transactions passed in here MUST already be run through filterSensitive().

import type {
  AppBehaviour,
  Customer,
  InsurancePolicy,
  LifeEventType,
  Transaction,
} from "@/lib/types";
import { LOOKBACK_DAYS, SIGNAL_PARAMS } from "./config";

export type DetectionInput = {
  customer: Customer;
  transactions: Transaction[]; // sensitive categories already removed
  policies: InsurancePolicy[];
  behaviour: AppBehaviour[];
  today: string; // YYYY-MM-DD
};

export type PresentSignal = {
  eventType: LifeEventType;
  signal: string; // key in EVENT_CONFIG[eventType].signals
  description: string; // plain language, shown to the customer
};

const DAY_MS = 24 * 60 * 60 * 1000;
const toMs = (date: string) => Date.parse(date.slice(0, 10) + "T00:00:00Z");
const daysAgo = (today: string, date: string) => Math.round((toMs(today) - toMs(date)) / DAY_MS);
const inWindow = (today: string, date: string) => {
  const age = daysAgo(today, date);
  return age >= 0 && age < LOOKBACK_DAYS;
};

/** 30-day bucket index counted back from today (0 = last 30 days), or -1 outside the window. */
const bucketOf = (today: string, date: string) =>
  inWindow(today, date) ? Math.floor(daysAgo(today, date) / 30) : -1;

/** First date each counterparty appears (within the given list). */
function firstSeen(txs: Transaction[]): Map<string, string> {
  const seen = new Map<string, string>();
  for (const t of txs) {
    const prev = seen.get(t.counterpartyId);
    if (!prev || t.date < prev) seen.set(t.counterpartyId, t.date);
  }
  return seen;
}

function hasHistoryBeforeWindow(input: DetectionInput): boolean {
  return input.transactions.some((t) => daysAgo(input.today, t.date) >= LOOKBACK_DAYS);
}

// ---------------------------------------------------------------------------
// moved_house
// ---------------------------------------------------------------------------

function movedHouse(input: DetectionInput): PresentSignal[] {
  const { customer, transactions: txs, policies, behaviour, today } = input;
  const out: PresentSignal[] = [];
  const add = (signal: string, description: string) =>
    out.push({ eventType: "moved_house", signal, description });

  const home = policies.find((p) => p.type === "home" && p.insuredAddress);
  if (home && normalise(home.insuredAddress!) !== normalise(customer.address)) {
    add("insured_address_outdated", "The address on your home insurance differs from the address we have for you");
  }

  const rent = txs.filter((t) => t.merchantCategory === "rent" && t.direction === "out");
  const rentFirst = firstSeen(rent);
  const history = hasHistoryBeforeWindow(input);
  const newRentCps = [...rentFirst].filter(([, first]) => inWindow(today, first)).map(([cp]) => cp);
  const olderRentExists = [...rentFirst].some(([cp]) => !newRentCps.includes(cp));
  const newRecurringRent = newRentCps.some(
    (cp) => rent.filter((t) => t.counterpartyId === cp && t.recurring).length >= 2,
  );
  if (history && olderRentExists && newRecurringRent) {
    add("new_rent", "A new monthly rent payment started");
  }

  const stoppedRent = [...rentFirst.keys()].some((cp) => {
    const payments = rent.filter((t) => t.counterpartyId === cp && t.recurring);
    if (payments.length < 2) return false;
    const last = payments.reduce((a, b) => (a.date > b.date ? a : b));
    return daysAgo(today, last.date) > SIGNAL_PARAMS.oldRentStoppedAfterDays;
  });
  if (stoppedRent) add("old_rent_stopped", "Your previous monthly rent payment stopped");

  const utilFirst = firstSeen(txs.filter((t) => t.merchantCategory === "utilities" && t.direction === "out"));
  if (history && [...utilFirst.values()].some((first) => inWindow(today, first))) {
    add("new_utility_provider", "A first payment to a new energy or utility provider");
  }

  if (txs.some((t) => t.merchantCategory === "moving" && inWindow(today, t.date))) {
    add("moving_company", "A payment to a moving company");
  }

  if (
    behaviour.some(
      (b) =>
        (b.type === "kate_question" || b.type === "search") &&
        inWindow(today, b.timestamp) &&
        SIGNAL_PARAMS.addressIntentPattern.test(b.value),
    )
  ) {
    add("address_intent", "You asked in the app how to change your address");
  }

  if (
    txs.some(
      (t) =>
        t.merchantCategory === "furniture" &&
        t.direction === "out" &&
        t.amount >= SIGNAL_PARAMS.largeFurnitureMinAmount &&
        inWindow(today, t.date),
    )
  ) {
    add("large_furniture", "A larger furniture purchase");
  }

  return out;
}

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// ---------------------------------------------------------------------------
// new_baby
// ---------------------------------------------------------------------------

function newBaby(input: DetectionInput): PresentSignal[] {
  const { customer, transactions: txs, policies, today } = input;
  const out: PresentSignal[] = [];
  const add = (signal: string, description: string) =>
    out.push({ eventType: "new_baby", signal, description });

  const childcare = txs.filter((t) => t.merchantCategory === "childcare" && t.direction === "out");
  const childcareFirst = firstSeen(childcare);
  const newChildcare = [...childcareFirst].some(
    ([cp, first]) =>
      inWindow(today, first) && childcare.filter((t) => t.counterpartyId === cp && t.recurring).length >= 2,
  );
  if (newChildcare) add("new_childcare_payment", "A new monthly childcare payment started");

  const benefit = txs.some(
    (t) => t.merchantCategory === "child_benefit" && t.direction === "in" && inWindow(today, t.date),
  );
  if (benefit) add("child_benefit_income", "You started receiving child benefit");

  const perBucket = [0, 0, 0];
  for (const t of txs) {
    if (t.merchantCategory !== "baby" || t.direction !== "out") continue;
    const b = bucketOf(today, t.date);
    if (b >= 0 && b < perBucket.length) perBucket[b] += t.amount;
  }
  const monthsOver = perBucket.filter((sum) => sum >= SIGNAL_PARAMS.babySpendingPerMonth).length;
  if (monthsOver >= SIGNAL_PARAMS.babySpendingMinMonths) {
    add("baby_spending_150", "Regular spending at baby stores in recent months");
  }

  // Household mismatch: the family policy covers the registered household size,
  // but child-related payments suggest the household may have grown.
  const family = policies.find((p) => p.type === "family_liability");
  if (family && (newChildcare || benefit)) {
    const registered = { single: 1, couple: 2, family: 3 }[customer.householdType];
    if (family.coveredHouseholdMembers < registered + 1) {
      add("household_mismatch", "Your family insurance may not cover everyone in your household");
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// frequent_traveller
// ---------------------------------------------------------------------------

function frequentTraveller(input: DetectionInput): PresentSignal[] {
  const { transactions: txs, today } = input;
  const out: PresentSignal[] = [];
  const add = (signal: string, description: string) =>
    out.push({ eventType: "frequent_traveller", signal, description });

  const perBucket = [0, 0, 0];
  for (const t of txs) {
    if (t.merchantCategory !== "travel" || t.direction !== "out") continue;
    const b = bucketOf(today, t.date);
    if (b >= 0 && b < perBucket.length) perBucket[b] += 1;
  }
  const busyMonths = perBucket.filter((n) => n >= SIGNAL_PARAMS.travelPerMonth).length;
  if (busyMonths >= 1) add("travel_3_per_month", "Several travel bookings within a single month");
  if (busyMonths >= SIGNAL_PARAMS.travelRepeatedMonths) {
    add("repeated_2_months", "Frequent travel bookings in more than one month");
  }

  const foreign = txs.filter((t) => t.foreign && t.direction === "out" && inWindow(today, t.date)).length;
  if (foreign >= SIGNAL_PARAMS.foreignPaymentsMin) add("foreign_card_payments", "Several card payments abroad");

  return out;
}

// ---------------------------------------------------------------------------

export const SIGNAL_EXTRACTORS: Record<LifeEventType, (input: DetectionInput) => PresentSignal[]> = {
  moved_house: movedHouse,
  new_baby: newBaby,
  frequent_traveller: frequentTraveller,
};

export function extractSignals(input: DetectionInput): PresentSignal[] {
  return Object.values(SIGNAL_EXTRACTORS).flatMap((fn) => fn(input));
}
