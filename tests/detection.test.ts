import { beforeEach, describe, expect, it } from "vitest";
import { resetState, getDetectionData } from "@/lib/data/store";
import { scoreCustomer, scoreInput } from "@/lib/detection/detector";
import { DEMO_TODAY } from "@/lib/detection/config";
import { extractSignals, type DetectionInput } from "@/lib/detection/signals";
import { filterSensitive } from "@/lib/detection/sensitiveFilter";
import { getPopulation } from "@/lib/data/population";
import type { LifeEventType, Transaction } from "@/lib/types";

const conf = (customerId: string, type: LifeEventType) =>
  scoreCustomer(customerId).find((s) => s.type === type)!.confidence;

beforeEach(() => resetState());

describe("planted demo customers", () => {
  it("Benjamin: moved_house > 0.85", () => expect(conf("customer_001", "moved_house")).toBeGreaterThan(0.85));
  it("Sarah: new_baby > 0.85", () => expect(conf("customer_002", "new_baby")).toBeGreaterThan(0.85));
  it("Thomas: frequent_traveller > 0.85", () =>
    expect(conf("customer_003", "frequent_traveller")).toBeGreaterThan(0.85));
  it("Emma: every event < 0.30", () => {
    for (const s of scoreCustomer("customer_004")) expect(s.confidence).toBeLessThan(0.3);
  });
  it("each planted customer only triggers their own event", () => {
    const above = (id: string) => scoreCustomer(id).filter((s) => s.confidence >= 0.5).map((s) => s.type);
    expect(above("customer_001")).toEqual(["moved_house"]);
    expect(above("customer_002")).toEqual(["new_baby"]);
    expect(above("customer_003")).toEqual(["frequent_traveller"]);
    expect(above("customer_004")).toEqual([]);
  });
  it("evidence is sorted strongest first", () => {
    for (const id of ["customer_001", "customer_002", "customer_003"]) {
      for (const s of scoreCustomer(id)) {
        const lrs = s.evidence.map((e) => e.likelihoodRatio);
        expect(lrs).toEqual([...lrs].sort((a, b) => b - a));
      }
    }
  });
  it("only the strongest signal per group counts (new rent beats old rent stopped)", () => {
    const moved = scoreCustomer("customer_001").find((s) => s.type === "moved_house")!;
    expect(moved.evidence.map((e) => e.signal)).toContain("new_rent");
    expect(moved.evidence.map((e) => e.signal)).not.toContain("old_rent_stopped");
    expect(moved.signals.find((s) => s.signal === "old_rent_stopped")?.counted).toBe(false);
  });
});

describe("near-misses", () => {
  const emma = () => getDetectionData("customer_004")!;
  const base = (): DetectionInput => {
    const d = emma();
    return {
      ...d,
      // strip Emma's own near-misses so each test adds exactly one
      transactions: d.transactions.filter((t) => !["furniture", "travel"].includes(t.merchantCategory) && !t.foreign),
      today: DEMO_TODAY,
    };
  };
  const extra = (t: Partial<Transaction>): Transaction => ({
    id: "tx_test",
    customerId: "customer_004",
    accountId: "acc_004_cur",
    date: "2026-09-10",
    amount: 1500,
    direction: "out",
    counterpartyId: "cp_test",
    merchantCategory: "other",
    description: "test",
    recurring: false,
    foreign: false,
    ...t,
  });

  it("a single furniture purchase never passes 0.50", () => {
    const input = base();
    input.transactions.push(extra({ merchantCategory: "furniture", amount: 4000 }));
    for (const s of scoreInput(input)) expect(s.confidence).toBeLessThan(0.5);
  });
  it("a single flight never passes 0.50", () => {
    const input = base();
    input.transactions.push(extra({ merchantCategory: "travel", amount: 900, foreign: true }));
    for (const s of scoreInput(input)) expect(s.confidence).toBeLessThan(0.5);
  });
  it("a single baby-store purchase is not enough for the spending signal", () => {
    const input = base();
    input.transactions.push(extra({ merchantCategory: "baby", amount: 400 }));
    expect(extractSignals(input).map((s) => s.signal)).not.toContain("baby_spending_150");
  });
});

describe("confidence bounds", () => {
  it("is always within [0, 1] for demo and synthetic customers", () => {
    for (const id of ["customer_001", "customer_002", "customer_003", "customer_004"]) {
      for (const s of scoreCustomer(id)) {
        expect(s.confidence).toBeGreaterThanOrEqual(0);
        expect(s.confidence).toBeLessThanOrEqual(1);
      }
    }
    for (const c of getPopulation().customers.slice(0, 500)) {
      for (const s of scoreInput(c.input)) {
        expect(s.confidence).toBeGreaterThanOrEqual(0);
        expect(s.confidence).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("sensitive filter", () => {
  it("removes hospital and pharmacy transactions", () => {
    const sarah = getDetectionData("customer_002")!;
    expect(sarah.transactions.some((t) => t.merchantCategory === "hospital")).toBe(true);
    expect(filterSensitive(sarah.transactions).some((t) => ["hospital", "pharmacy"].includes(t.merchantCategory))).toBe(false);
  });

  it("Sarah's hospital payment never appears in any evidence", () => {
    const all = scoreCustomer("customer_002").flatMap((s) => s.signals);
    const text = JSON.stringify(all).toLowerCase();
    expect(text).not.toMatch(/hospital|pharmacy|health|medical/);
  });

  it("health payments cannot create signals even if they look like other events", () => {
    const sarah = getDetectionData("customer_002")!;
    const withoutHealth = scoreInput({ ...sarah, transactions: filterSensitive(sarah.transactions), today: DEMO_TODAY });
    // Add many hospital payments abroad: must change nothing.
    const noisy = [...sarah.transactions];
    for (let i = 0; i < 6; i++) {
      noisy.push({ ...sarah.transactions[0], id: `h${i}`, date: "2026-09-1" + i, merchantCategory: "hospital", foreign: true });
    }
    expect(scoreInput({ ...sarah, transactions: noisy, today: DEMO_TODAY })).toEqual(withoutHealth);
  });
});
