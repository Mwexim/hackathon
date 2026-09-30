// Explainable likelihood-ratio scoring. No ML, no LLM, fully offline.
// The system detects a POSSIBILITY, never a fact — every result is a question.

import { randomUUID } from "crypto";
import type {
  Customer,
  Evidence,
  LifeEvent,
  LifeEventType,
  MathSignal,
  QuestionTier,
} from "@/lib/types";
import { getDetectionData } from "@/lib/data/store";
import { DEMO_TODAY, EVENT_CONFIG, tierFor } from "./config";
import { extractSignals, type DetectionInput } from "./signals";

export type EventScore = {
  type: LifeEventType;
  prior: number;
  priorOdds: number;
  odds: number;
  confidence: number; // always 0..1
  tier: QuestionTier;
  evidence: Evidence[]; // counted signals, strongest first
  signals: MathSignal[]; // every present signal, incl. ones that did not count
};

const round = (n: number, digits = 3) => Math.round(n * 10 ** digits) / 10 ** digits;

/** Pure scoring: combine present signals into a confidence per life-event type. */
export function scoreInput(input: DetectionInput): EventScore[] {
  const present = extractSignals(input); // sensitive filter runs inside

  return (Object.keys(EVENT_CONFIG) as LifeEventType[]).map((type) => {
    const cfg = EVENT_CONFIG[type];
    const candidates = present
      .filter((p) => p.eventType === type && cfg.signals[p.signal])
      .map((p) => ({ ...p, ...cfg.signals[p.signal] }))
      .sort((a, b) => b.likelihoodRatio - a.likelihoodRatio);

    // Only the strongest signal per group counts (correlated signals).
    const usedGroups = new Set<string>();
    const signals: MathSignal[] = candidates.map((c) => {
      const counted = !usedGroups.has(c.group);
      usedGroups.add(c.group);
      return {
        signal: c.signal,
        group: c.group,
        likelihoodRatio: c.likelihoodRatio,
        description: c.description,
        counted,
      };
    });
    const evidence: Evidence[] = signals
      .filter((s) => s.counted)
      .map(({ signal, description, likelihoodRatio }) => ({ signal, description, likelihoodRatio }));

    const priorOdds = cfg.prior / (1 - cfg.prior);
    const odds = evidence.reduce((acc, e) => acc * e.likelihoodRatio, priorOdds);
    const confidence = round(Math.min(1, Math.max(0, odds / (1 + odds))));

    return {
      type,
      prior: cfg.prior,
      priorOdds: round(priorOdds, 4),
      odds: round(odds, 4),
      confidence,
      tier: tierFor(confidence),
      evidence,
      signals,
    };
  });
}

/** Scores for every life-event type for one customer, using the CURRENT store state. */
export function scoreCustomer(customerId: string): EventScore[] {
  const data = getDetectionData(customerId);
  if (!data) return [];
  return scoreInput({ ...data, today: DEMO_TODAY });
}

/** Whether the customer's preferences allow asking about this event at this tier. */
function allowedToAsk(customer: Customer, score: EventScore): boolean {
  if (score.tier === "none") return false;
  if (customer.consent.topicsMuted.includes(score.type)) return false;
  if (customer.consent.proactivityLevel === "low" && score.tier !== "direct") return false;
  return true;
}

/** Life events worth asking about (confidence >= soft threshold), highest confidence first. */
export function detectLifeEvents(customerId: string): LifeEvent[] {
  const data = getDetectionData(customerId);
  if (!data) return [];
  const detectedAt = `${DEMO_TODAY}T08:00:00.000Z`;

  return scoreInput({ ...data, today: DEMO_TODAY })
    .filter((s) => allowedToAsk(data.customer, s))
    .sort((a, b) => b.confidence - a.confidence)
    .map((s) => ({
      id: randomUUID(),
      customerId,
      type: s.type,
      confidence: s.confidence,
      status: "detected" as const,
      detectedAt,
      evidence: s.evidence,
    }));
}
