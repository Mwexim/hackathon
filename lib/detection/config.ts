// All detection numbers live here. These are TEAM ESTIMATES, not fitted values.
// Model: odds = prior/(1-prior) * product(LR of strongest present signal per group)
//        confidence = odds / (1 + odds)

import type { LifeEventType, QuestionTier } from "@/lib/types";

/** The demo "today". Mock data is anchored to this date so results never drift. */
export const DEMO_TODAY = "2026-09-30";

/** Only signals from the last N days count. */
export const LOOKBACK_DAYS = 90;

/** Question thresholds. */
export const THRESHOLDS = {
  direct: 0.85, // >= direct -> direct question ("Have you recently moved?")
  soft: 0.5, //    >= soft   -> softer question; below -> nothing
} as const;

export type SignalConfig = {
  group: string; // correlated signals share a group; only the strongest counts
  likelihoodRatio: number;
};

export type EventConfig = {
  prior: number;
  signals: Record<string, SignalConfig>;
};

export const EVENT_CONFIG: Record<LifeEventType, EventConfig> = {
  moved_house: {
    prior: 0.02,
    signals: {
      insured_address_outdated: { group: "insured_address", likelihoodRatio: 15 },
      new_rent: { group: "rent_change", likelihoodRatio: 8 },
      old_rent_stopped: { group: "rent_change", likelihoodRatio: 4 },
      new_utility_provider: { group: "utility", likelihoodRatio: 5 },
      moving_company: { group: "moving", likelihoodRatio: 6 },
      address_intent: { group: "address_intent", likelihoodRatio: 4 },
      large_furniture: { group: "furniture", likelihoodRatio: 2 },
    },
  },
  new_baby: {
    prior: 0.01,
    signals: {
      new_childcare_payment: { group: "childcare", likelihoodRatio: 12 },
      child_benefit_income: { group: "child_benefit", likelihoodRatio: 15 },
      baby_spending_150: { group: "baby_spending", likelihoodRatio: 4 },
      household_mismatch: { group: "household", likelihoodRatio: 5 },
    },
  },
  frequent_traveller: {
    prior: 0.05,
    signals: {
      // Tuned up from the initial 6 / 3 / 3: with those values a clear
      // frequent traveller only reached ~0.74, below the 0.85 target.
      travel_3_per_month: { group: "travel_frequency", likelihoodRatio: 8 },
      repeated_2_months: { group: "travel_repetition", likelihoodRatio: 5 },
      foreign_card_payments: { group: "foreign", likelihoodRatio: 4 },
    },
  },
};

/** Signal parameters (thresholds used inside signals.ts). */
export const SIGNAL_PARAMS = {
  largeFurnitureMinAmount: 500,
  babySpendingPerMonth: 150,
  babySpendingMinMonths: 2, // one purchase must never be enough
  travelPerMonth: 3,
  travelRepeatedMonths: 2,
  foreignPaymentsMin: 3,
  oldRentStoppedAfterDays: 45,
  addressIntentPattern: /\b(address|adres|adresse|verhuis|move|moving|déménag)/i,
} as const;

export function tierFor(confidence: number): QuestionTier {
  if (confidence >= THRESHOLDS.direct) return "direct";
  if (confidence >= THRESHOLDS.soft) return "soft";
  return "none";
}
