// Explainable likelihood-ratio scoring. No ML, no LLM, fully offline.
// The system detects a POSSIBILITY, never a fact — every result is a question.

import { randomUUID } from "crypto";
import type { Customer, Evidence, LifeEvent, LifeEventType, QuestionTier } from "@/lib/types";
import { getDetectionData } from "@/lib/data/store";
import { DEMO_TODAY, EVENT_CONFIG, tierFor } from "./config";
import { filterSensitive } from "./sensitiveFilter";
import { extractSignals, type DetectionInput } from "./signals";

export type EventScore = {
  type: LifeEventType;
  confidence: number;
  tier: QuestionTier;
  evidence: Evidence[];
};

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** Pure scoring: combine present signals into a confidence per life-event type. */
export function scoreInput(input: DetectionInput): EventScore[] {
  const present = extractSignals({ ...input, transactions: filterSensitive(input.transactions) });

  return (Object.keys(EVENT_CONFIG) as LifeEventType[]).map((type) => {
    const cfg = EVENT_CONFIG[type];

    // Only the strongest signal per group counts (correlated signals).
    const strongestPerGroup = new Map<string, Evidence>();
    for (const s of present.filter((p) => p.eventType === type)) {
      const sc = cfg.signals[s.signal];
      if (!sc) continue;
      const current = strongestPerGroup.get(sc.group);
      if (!current || sc.likelihoodRatio > current.likelihoodRatio) {
        strongestPerGroup.set(sc.group, {
          signal: s.signal,
          description: s.description,
          likelihoodRatio: sc.likelihoodRatio,
        });
      }
    }
    const evidence = [...strongestPerGroup.values()].sort((a, b) => b.likelihoodRatio - a.likelihoodRatio);

    const priorOdds = cfg.prior / (1 - cfg.prior);
    const odds = evidence.reduce((acc, e) => acc * e.likelihoodRatio, priorOdds);
    const confidence = round3(Math.min(1, Math.max(0, odds / (1 + odds))));

    return { type, confidence, tier: tierFor(confidence), evidence };
  });
}

/** Scores for every life-event type for one customer (used by the debug view). */
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

/** Life events worth asking the customer about (confidence >= soft threshold). */
export function detectLifeEvents(customerId: string): LifeEvent[] {
  const data = getDetectionData(customerId);
  if (!data) return [];
  const detectedAt = `${DEMO_TODAY}T08:00:00.000Z`;

  return scoreInput({ ...data, today: DEMO_TODAY })
    .filter((s) => allowedToAsk(data.customer, s))
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
