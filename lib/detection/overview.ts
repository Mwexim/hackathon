// Scans the synthetic population and computes precision / recall against the
// planted ground truth. Used by GET /api/employee/overview.

import type { EmployeeOverview, LifeEventType } from "@/lib/types";
import { getPopulation } from "@/lib/data/population";
import { recommendationsFor } from "@/lib/recommendations/catalogue";
import { EVENT_CONFIG } from "./config";
import { scoreInput } from "./detector";

const TYPES = Object.keys(EVENT_CONFIG) as LifeEventType[];
const r3 = (n: number) => Math.round(n * 1000) / 1000;

export function buildOverview(threshold: number): EmployeeOverview {
  const { customers, groundTruth } = getPopulation();

  const start = performance.now();
  const scored = customers.map((c) => ({
    id: c.input.customer.id,
    consent: c.consent,
    policies: c.input.policies,
    scores: scoreInput(c.input),
  }));
  const runtimeMs = Math.round((performance.now() - start) * 10) / 10;

  const metrics = (t: number, only?: LifeEventType) => {
    let tp = 0, detected = 0, planted = 0;
    for (const c of scored) {
      const truth = groundTruth.get(c.id)!;
      for (const s of c.scores) {
        if (only && s.type !== only) continue;
        const hit = s.confidence >= t;
        const real = truth.has(s.type);
        if (hit) detected++;
        if (real) planted++;
        if (hit && real) tp++;
      }
    }
    return {
      detected,
      planted,
      precision: r3(detected ? tp / detected : 1),
      recall: r3(planted ? tp / planted : 1),
    };
  };

  const perEvent = TYPES.map((type) => ({ type, ...metrics(threshold, type) }));

  const thresholdCurve: EmployeeOverview["thresholdCurve"] = [];
  for (let t = 0.3; t <= 0.951; t += 0.05) {
    const m = metrics(t);
    thresholdCurve.push({ threshold: r3(t), precision: m.precision, recall: m.recall });
  }

  // Histogram over customer/event pairs with at least one signal (the rest sit at the prior).
  const buckets = Array.from({ length: 10 }, (_, i) => ({ bucket: `${(i / 10).toFixed(1)}–${((i + 1) / 10).toFixed(1)}`, count: 0 }));
  for (const c of scored) {
    for (const s of c.scores) {
      if (s.evidence.length === 0) continue;
      buckets[Math.min(9, Math.floor(s.confidence * 10))].count++;
    }
  }

  const consentMix = { none: 0, basic: 0, tailored: 0 };
  const actionsByKind = { service: 0, commercial: 0 };
  for (const c of scored) {
    consentMix[c.consent]++;
    for (const s of c.scores) {
      if (s.confidence < threshold) continue;
      for (const rec of recommendationsFor(s.type, c.consent, { policies: c.policies })) actionsByKind[rec.kind]++;
    }
  }

  return {
    totalCustomers: customers.length,
    runtimeMs,
    threshold,
    perEvent,
    thresholdCurve,
    confidenceHistogram: buckets,
    consentMix,
    actionsByKind,
  };
}
