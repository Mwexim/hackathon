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
  direct: 0.85, // team estimate: high enough to ask plainly ("Have you recently moved?")
  soft: 0.5, //    team estimate: more likely than not -> gentle, open question; below: stay silent
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
    prior: 0.02, // team estimate: ~2% of customers move in any given quarter
    signals: {
      insured_address_outdated: { group: "insured_address", likelihoodRatio: 15 }, // team estimate: rare unless the customer moved and told us
      new_rent: { group: "rent_change", likelihoodRatio: 8 }, // team estimate: new landlord is strong evidence
      old_rent_stopped: { group: "rent_change", likelihoodRatio: 4 }, // team estimate: weaker alone (could be buying); same group as new_rent
      new_utility_provider: { group: "utility", likelihoodRatio: 5 }, // team estimate: people rarely switch energy provider without moving
      moving_company: { group: "moving", likelihoodRatio: 6 }, // team estimate: could be helping someone else move
      address_intent: { group: "address_intent", likelihoodRatio: 4 }, // team estimate: asking about address changes in the app
      large_furniture: { group: "furniture", likelihoodRatio: 2 }, // team estimate: common without moving, so weak
    },
  },
  new_baby: {
    prior: 0.01, // team estimate: ~1% of customers have a baby in any given quarter
    signals: {
      new_childcare_payment: { group: "childcare", likelihoodRatio: 12 }, // team estimate: new recurring childcare rarely has another cause
      child_benefit_income: { group: "child_benefit", likelihoodRatio: 15 }, // team estimate: first child benefit is near-direct evidence
      baby_spending_150: { group: "baby_spending", likelihoodRatio: 4 }, // team estimate: could be gifts, so moderate
      household_mismatch: { group: "household", likelihoodRatio: 5 }, // team estimate: policy covers fewer people than signals suggest
    },
  },
  frequent_traveller: {
    prior: 0.05, // team estimate: ~5% of customers travel frequently
    signals: {
      // Tuned up from 6 / 3 / 3: with those values a clear frequent traveller only
      // reached ~0.74, below the 0.85 target.
      travel_3_per_month: { group: "travel_frequency", likelihoodRatio: 8 }, // team estimate: 3+ bookings in one month
      repeated_2_months: { group: "travel_repetition", likelihoodRatio: 5 }, // team estimate: a pattern, not one holiday
      foreign_card_payments: { group: "foreign", likelihoodRatio: 4 }, // team estimate: actually spending abroad
    },
  },
};

/** Signal parameters (thresholds used inside signals.ts). */
export const SIGNAL_PARAMS = {
  recurringMinDays: 25, // "roughly monthly" interval, lower bound
  recurringMaxDays: 35, // "roughly monthly" interval, upper bound
  recurringAmountTolerance: 0.2, // amounts within 20% of the median count as "similar"
  largeFurnitureMinAmount: 500,
  babySpendingPerMonth: 150,
  babySpendingMinMonths: 2, // one purchase must never be enough
  travelPerMonth: 3,
  travelRepeatedMonths: 2,
  foreignPaymentsMin: 3,
  stoppedAfterDays: 45, // a monthly payment missing for 45+ days has stopped
  addressIntentPattern: /\b(address|adres|adresse|verhuis|move|moving|déménag)/i,
} as const;

export function tierFor(confidence: number): QuestionTier {
  if (confidence >= THRESHOLDS.direct) return "direct";
  if (confidence >= THRESHOLDS.soft) return "soft";
  return "none";
}
