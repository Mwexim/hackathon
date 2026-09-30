// Synthetic population for the employee dashboard: proves the engine at scale.
// Seeded PRNG (mulberry32, seed 42) -> identical population on every run.
// Planted life events (~4% moved, ~2% baby, ~6% traveller) are only PARTIALLY
// visible in the data (each signal appears with some probability), and ~15% of
// the rest get near-misses, so precision/recall are realistic rather than perfect.
// These customers cannot log in; ground truth is kept separately.

import type {
  AppBehaviour,
  ConsentLevel,
  Customer,
  InsurancePolicy,
  LifeEventType,
  MerchantCategory,
  Transaction,
} from "@/lib/types";
import { DEMO_TODAY } from "@/lib/detection/config";
import type { DetectionInput } from "@/lib/detection/signals";

export const POPULATION_SIZE = 2000;
const SEED = 42;
const MONTHS = ["2026-06", "2026-07", "2026-08", "2026-09"];

export type SyntheticCustomer = {
  input: DetectionInput;
  consent: ConsentLevel;
};

export type Population = {
  customers: SyntheticCustomer[];
  groundTruth: Map<string, Set<LifeEventType>>;
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generate(): Population {
  const rand = mulberry32(SEED);
  const chance = (p: number) => rand() < p;
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
  const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
  const day = (month: string, d: number) => `${month}-${String(d).padStart(2, "0")}`;

  const customers: SyntheticCustomer[] = [];
  const groundTruth = new Map<string, Set<LifeEventType>>();

  for (let i = 0; i < POPULATION_SIZE; i++) {
    const id = `pop_${String(i).padStart(5, "0")}`;
    const txs: Transaction[] = [];
    const behaviour: AppBehaviour[] = [];
    let n = 0;
    const tx = (
      date: string,
      amount: number,
      category: MerchantCategory,
      counterpartyId: string,
      opts: { direction?: "in" | "out"; foreign?: boolean; recurring?: boolean } = {},
    ) =>
      txs.push({
        id: `${id}_tx_${n++}`,
        customerId: id,
        accountId: `${id}_cur`,
        date,
        amount: Math.round(amount * 100) / 100,
        direction: opts.direction ?? "out",
        counterpartyId,
        merchantCategory: category,
        description: category,
        recurring: opts.recurring ?? false,
        foreign: opts.foreign ?? false,
      });

    const consent: ConsentLevel = pick(["none", "none", "basic", "basic", "basic", "tailored", "tailored"] as const);
    const householdType = pick(["single", "single", "couple", "couple", "family"] as const);
    const address = `Synthetic street ${i}`;
    const customer: Customer = {
      id,
      name: `Synthetic ${i}`,
      age: int(20, 75),
      postcode: String(int(1000, 9999)),
      householdType,
      language: pick(["nl", "fr", "en"] as const),
      customerSince: "2015-01-01",
      digitalActive: true,
      address,
      consent: { marketing: consent, proactivityLevel: "medium", preferredChannel: "app", topicsMuted: [] },
    };

    const policies: InsurancePolicy[] = [];
    if (chance(0.7)) policies.push({ id: `${id}_home`, customerId: id, type: "home", insuredAddress: address, coveredHouseholdMembers: 1, premium: 300, renewalDate: "2027-01-01" });
    if (chance(0.5)) policies.push({ id: `${id}_fam`, customerId: id, type: "family_liability", coveredHouseholdMembers: { single: 1, couple: 2, family: 3 }[householdType], premium: 90, renewalDate: "2027-01-01" });
    if (chance(0.2)) policies.push({ id: `${id}_travel`, customerId: id, type: "travel", coveredHouseholdMembers: 1, premium: 0, renewalDate: "2027-01-01", includesTravelCover: true });

    // --- everyday baseline ---
    const renter = chance(0.6);
    const rent = int(650, 1300);
    const utility = int(60, 140);
    const salary = int(2000, 4800);
    MONTHS.forEach((m) => {
      tx(day(m, 25), salary, "salary", `${id}_employer`, { direction: "in", recurring: true });
      if (renter) tx(day(m, 1), rent, "rent", `${id}_rent_a`, { recurring: true });
      if (!renter) tx(day(m, 2), rent + 200, "other", `${id}_mortgage`, { recurring: true });
      tx(day(m, 15), utility, "utilities", `${id}_util_a`, { recurring: true });
      for (let w = 0; w < 4; w++) tx(day(m, 3 + w * 7), int(30, 110), "groceries", `grocery_${int(1, 20)}`);
      for (let r = 0; r < 2; r++) tx(day(m, int(5, 27)), int(15, 70), "restaurants", `resto_${int(1, 50)}`);
    });
    // Planted moves below remove the old rent/utility from the move month onwards.

    const planted = new Set<LifeEventType>();
    const r = rand();

    const addMove = (p: { address: number; rent: number; utility: number; mover: number; intent: number; furniture: number }) => {
      const moveMonth = pick([1, 2]); // July or August
      if (chance(p.address)) {
        const home = policies.find((x) => x.type === "home");
        if (home) customer.address = `New synthetic street ${i}`;
      }
      if (renter && chance(p.rent)) {
        // old rent stops before the move, new landlord starts in the move month
        for (let k = txs.length - 1; k >= 0; k--) {
          if (txs[k].counterpartyId === `${id}_rent_a` && MONTHS.indexOf(txs[k].date.slice(0, 7)) >= moveMonth) txs.splice(k, 1);
        }
        MONTHS.slice(moveMonth).forEach((m) => tx(day(m, 5), rent + int(-50, 150), "rent", `${id}_rent_b`, { recurring: true }));
      }
      if (chance(p.utility)) {
        for (let k = txs.length - 1; k >= 0; k--) {
          if (txs[k].counterpartyId === `${id}_util_a` && MONTHS.indexOf(txs[k].date.slice(0, 7)) >= moveMonth) txs.splice(k, 1);
        }
        MONTHS.slice(moveMonth).forEach((m) => tx(day(m, 20), utility + 10, "utilities", `${id}_util_b`, { recurring: true }));
      }
      if (chance(p.mover)) tx(day(MONTHS[moveMonth], int(5, 20)), int(400, 1400), "moving", `mover_${int(1, 30)}`);
      if (chance(p.intent)) behaviour.push({ id: `${id}_b1`, customerId: id, timestamp: `${day(MONTHS[moveMonth], 10)}T10:00:00Z`, type: "kate_question", value: "How do I change my address?" });
      if (chance(p.furniture)) tx(day(MONTHS[moveMonth], int(10, 27)), int(550, 2500), "furniture", `furniture_${int(1, 40)}`);
    };

    const addBaby = (p: { childcare: number; benefit: number; spending: number }) => {
      if (chance(p.childcare)) ["2026-08", "2026-09"].forEach((m) => tx(day(m, 5), 480, "childcare", `${id}_creche`, { recurring: true }));
      if (chance(p.benefit)) ["2026-08", "2026-09"].forEach((m) => tx(day(m, 10), 173.2, "child_benefit", "child_benefit_agency", { direction: "in", recurring: true }));
      if (chance(p.spending)) ["2026-07", "2026-08", "2026-09"].forEach((m) => { tx(day(m, 8), int(80, 120), "baby", "babystore_1"); tx(day(m, 22), int(60, 100), "baby", "babystore_2"); });
      if (chance(0.3)) tx(day("2026-07", 14), 420, "hospital", "hospital_1"); // never used as evidence
    };

    const addTravel = (busyMonths: number, foreignP: number) => {
      ["2026-07", "2026-08", "2026-09"].slice(0, busyMonths).forEach((m) => {
        for (let k = 0; k < int(3, 4); k++) tx(day(m, 4 + k * 6), int(90, 450), "travel", `travel_${int(1, 60)}`);
      });
      if (chance(foreignP)) for (let k = 0; k < int(3, 5); k++) tx(day(pick(["2026-07", "2026-08", "2026-09"]), int(3, 27)), int(15, 90), "restaurants", `abroad_${int(1, 80)}`, { foreign: true });
    };

    if (r < 0.04) {
      planted.add("moved_house");
      addMove({ address: 0.7, rent: 0.9, utility: 0.75, mover: 0.6, intent: 0.4, furniture: 0.5 });
    } else if (r < 0.06) {
      planted.add("new_baby");
      addBaby({ childcare: 0.7, benefit: 0.8, spending: 0.75 });
    } else if (r < 0.12) {
      planted.add("frequent_traveller");
      addTravel(pick([1, 2, 2, 3, 3]), 0.75);
    } else if (chance(0.15)) {
      // near-misses: real-life noise that looks a bit like a life event
      switch (int(0, 6)) {
        case 0: tx(day("2026-08", int(1, 27)), int(550, 1800), "furniture", `furniture_${int(1, 40)}`); break;
        case 1: tx(day("2026-09", int(1, 27)), int(90, 300), "travel", `travel_${int(1, 60)}`); break;
        case 2: addTravel(1, 1); break; // one busy holiday month abroad
        case 3: tx(day("2026-08", int(1, 27)), int(300, 900), "moving", `mover_${int(1, 30)}`); break; // helping a friend move
        case 4: tx(day("2026-08", 12), 180, "baby", "babystore_1"); break; // a baby gift
        case 5: addMove({ address: 0, rent: 0, utility: 1, mover: 0, intent: 0, furniture: 1 }); break; // switched energy + new sofa
        case 6: addMove({ address: 0, rent: 0, utility: 0, mover: 1, intent: 1, furniture: 1 }); break; // helping someone move
      }
    }

    groundTruth.set(id, planted);
    customers.push({
      input: { customer, transactions: txs, policies, behaviour, today: DEMO_TODAY },
      consent,
    });
  }

  return { customers, groundTruth };
}

const g = globalThis as unknown as { __lifeMomentsPopulation?: Population };

/** Generated lazily once, then cached in memory. */
export function getPopulation(): Population {
  g.__lifeMomentsPopulation ??= generate();
  return g.__lifeMomentsPopulation;
}
