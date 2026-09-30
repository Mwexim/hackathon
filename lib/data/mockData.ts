// Deterministic, fully synthetic demo data. No randomness: every value is
// derived from fixed tables or simple arithmetic so every run is identical.
// All data is anchored to DEMO_TODAY (see lib/detection/config.ts).
// Counterparties are pseudonymised IDs — no real merchant names.

import type {
  Account,
  AppBehaviour,
  Customer,
  InsurancePolicy,
  MerchantCategory,
  Transaction,
} from "@/lib/types";

export type GeneralNotificationSeed = {
  customerId: string;
  title: string;
  message: string;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export const customers: Customer[] = [
  {
    id: "customer_001",
    name: "Benjamin",
    age: 31,
    postcode: "3000",
    householdType: "single",
    language: "nl",
    customerSince: "2014-03-12",
    digitalActive: true,
    address: "Bondgenotenlaan 45, 3000 Leuven", // NEW address
    consent: {
      marketing: "tailored",
      proactivityLevel: "high",
      preferredChannel: "app",
      topicsMuted: [],
    },
  },
  {
    id: "customer_002",
    name: "Sarah",
    age: 34,
    postcode: "9000",
    householdType: "couple",
    language: "nl",
    customerSince: "2011-09-01",
    digitalActive: true,
    address: "Veldstraat 102, 9000 Gent",
    consent: {
      marketing: "basic",
      proactivityLevel: "medium",
      preferredChannel: "app",
      topicsMuted: [],
    },
  },
  {
    id: "customer_003",
    name: "Thomas",
    age: 42,
    postcode: "1000",
    householdType: "single",
    language: "fr",
    customerSince: "2008-06-20",
    digitalActive: true,
    address: "Rue Haute 210, 1000 Bruxelles",
    consent: {
      marketing: "none",
      proactivityLevel: "medium",
      preferredChannel: "app",
      topicsMuted: [],
    },
  },
  {
    id: "customer_004",
    name: "Emma",
    age: 27,
    postcode: "2018",
    householdType: "single",
    language: "en",
    customerSince: "2019-01-15",
    digitalActive: true,
    address: "Lange Kievitstraat 8, 2018 Antwerpen",
    consent: {
      marketing: "tailored",
      proactivityLevel: "high",
      preferredChannel: "app",
      topicsMuted: [],
    },
  },
];

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export const accounts: Account[] = [
  { id: "acc_001_cur", customerId: "customer_001", type: "current", name: "Current account", balance: 2184.37, currency: "EUR" },
  { id: "acc_001_sav", customerId: "customer_001", type: "savings", name: "Savings account", balance: 9420.0, currency: "EUR" },

  { id: "acc_002_cur", customerId: "customer_002", type: "current", name: "Current account", balance: 3312.8, currency: "EUR" },
  { id: "acc_002_sav", customerId: "customer_002", type: "savings", name: "Savings account", balance: 15870.55, currency: "EUR" },

  { id: "acc_003_cur", customerId: "customer_003", type: "current", name: "Current account", balance: 5120.12, currency: "EUR" },
  { id: "acc_003_cc", customerId: "customer_003", type: "credit_card", name: "Gold credit card", balance: -1245.6, currency: "EUR" },
  { id: "acc_003_sav", customerId: "customer_003", type: "savings", name: "Savings account", balance: 32150.0, currency: "EUR" },

  { id: "acc_004_cur", customerId: "customer_004", type: "current", name: "Current account", balance: 1476.9, currency: "EUR" },
  { id: "acc_004_sav", customerId: "customer_004", type: "savings", name: "Savings account", balance: 4210.0, currency: "EUR" },
];

// ---------------------------------------------------------------------------
// Insurance policies
// ---------------------------------------------------------------------------

export const policies: InsurancePolicy[] = [
  // Benjamin: home insurance still on the OLD address.
  { id: "pol_001_home", customerId: "customer_001", type: "home", insuredAddress: "Kerkstraat 12, 2000 Antwerpen", coveredHouseholdMembers: 1, premium: 312, renewalDate: "2027-02-01" },
  { id: "pol_001_car", customerId: "customer_001", type: "car", coveredHouseholdMembers: 1, premium: 540, renewalDate: "2027-05-15" },

  // Sarah: family liability covers 2 people; household is now 3.
  { id: "pol_002_fam", customerId: "customer_002", type: "family_liability", coveredHouseholdMembers: 2, premium: 96, renewalDate: "2027-01-01" },
  { id: "pol_002_home", customerId: "customer_002", type: "home", insuredAddress: "Veldstraat 102, 9000 Gent", coveredHouseholdMembers: 2, premium: 355, renewalDate: "2027-03-10" },

  // Thomas: credit card comes with travel cover.
  { id: "pol_003_travel", customerId: "customer_003", type: "travel", coveredHouseholdMembers: 1, premium: 0, renewalDate: "2027-06-20", includesTravelCover: true },
  { id: "pol_003_car", customerId: "customer_003", type: "car", coveredHouseholdMembers: 1, premium: 610, renewalDate: "2027-04-01" },

  // Emma: everything up to date.
  { id: "pol_004_home", customerId: "customer_004", type: "home", insuredAddress: "Lange Kievitstraat 8, 2018 Antwerpen", coveredHouseholdMembers: 1, premium: 248, renewalDate: "2027-01-20" },
  { id: "pol_004_fam", customerId: "customer_004", type: "family_liability", coveredHouseholdMembers: 1, premium: 72, renewalDate: "2027-01-20" },
];

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

type TxSeed = {
  date: string;
  amount: number;
  direction: "in" | "out";
  counterpartyId: string;
  merchantCategory: MerchantCategory;
  description: string;
  recurring?: boolean;
  foreign?: boolean;
  accountId?: string;
};

const MONTHS = ["2026-06", "2026-07", "2026-08", "2026-09"] as const;

const d = (month: string, day: number) => `${month}-${String(day).padStart(2, "0")}`;

/** Deterministic "noise": small variation derived from indices, no Math.random. */
const vary = (base: number, i: number, spread: number) =>
  Math.round((base + (((i * 37) % 11) - 5) * (spread / 5)) * 100) / 100;

/** Everyday spending shared by all customers (groceries, restaurants, subscriptions, transport). */
function everydayNoise(seed: number, opts: { salary: number; salaryCp: string }): TxSeed[] {
  const out: TxSeed[] = [];
  MONTHS.forEach((m, mi) => {
    const k = seed * 10 + mi;
    out.push({ date: d(m, 25), amount: opts.salary, direction: "in", counterpartyId: opts.salaryCp, merchantCategory: "salary", description: "Salary", recurring: true });
    [3, 10, 17, 24].forEach((day, wi) => {
      out.push({ date: d(m, day), amount: vary(68, k + wi, 18), direction: "out", counterpartyId: `cp_grocery_${String(100 + ((seed + wi) % 3)).padStart(3, "0")}`, merchantCategory: "groceries", description: "Supermarket" });
    });
    [8, 21].forEach((day, ri) => {
      out.push({ date: d(m, day), amount: vary(42, k + ri * 3, 14), direction: "out", counterpartyId: `cp_restaurant_${String(200 + ((k + ri) % 5)).padStart(3, "0")}`, merchantCategory: "restaurants", description: "Restaurant" });
    });
    out.push({ date: d(m, 5), amount: 13.99, direction: "out", counterpartyId: "cp_streaming_301", merchantCategory: "subscriptions", description: "Streaming subscription", recurring: true });
    out.push({ date: d(m, 12), amount: 25.0, direction: "out", counterpartyId: "cp_telecom_302", merchantCategory: "subscriptions", description: "Mobile phone plan", recurring: true });
    [6, 14, 27].forEach((day, ti) => {
      out.push({ date: d(m, day), amount: vary(18, k + ti * 7, 6), direction: "out", counterpartyId: `cp_transport_${String(400 + (ti % 2)).padStart(3, "0")}`, merchantCategory: "transport", description: ti === 1 ? "Fuel station" : "Public transport" });
    });
  });
  // Drop dates after DEMO_TODAY's month end (all generated days are <= 27, so fine).
  return out;
}

function monthly(days: { month: string; day: number }[], t: Omit<TxSeed, "date">): TxSeed[] {
  return days.map(({ month, day }) => ({ ...t, date: d(month, day) }));
}

// Benjamin — moved house (old rent stops, new rent starts, new utility, mover, furniture)
const benjamin: TxSeed[] = [
  ...everydayNoise(1, { salary: 3150, salaryCp: "cp_employer_011" }),
  ...monthly([{ month: "2026-06", day: 1 }, { month: "2026-07", day: 1 }], { amount: 850, direction: "out", counterpartyId: "cp_rent_031", merchantCategory: "rent", description: "Monthly rent", recurring: true }),
  ...monthly([{ month: "2026-08", day: 1 }, { month: "2026-09", day: 1 }], { amount: 980, direction: "out", counterpartyId: "cp_rent_207", merchantCategory: "rent", description: "Monthly rent", recurring: true }),
  ...monthly([{ month: "2026-06", day: 15 }, { month: "2026-07", day: 15 }], { amount: 92, direction: "out", counterpartyId: "cp_utility_044", merchantCategory: "utilities", description: "Energy bill", recurring: true }),
  ...monthly([{ month: "2026-08", day: 20 }, { month: "2026-09", day: 20 }], { amount: 105, direction: "out", counterpartyId: "cp_utility_118", merchantCategory: "utilities", description: "Energy bill", recurring: true }),
  { date: "2026-07-30", amount: 890, direction: "out", counterpartyId: "cp_moving_052", merchantCategory: "moving", description: "Moving services" },
  { date: "2026-08-06", amount: 1240, direction: "out", counterpartyId: "cp_furniture_014", merchantCategory: "furniture", description: "Furniture store" },
];

// Sarah — new baby (childcare, child benefit, baby spending, hospital = filtered)
const sarah: TxSeed[] = [
  ...everydayNoise(2, { salary: 2870, salaryCp: "cp_employer_021" }),
  ...monthly(MONTHS.map((month) => ({ month, day: 2 })), { amount: 1150, direction: "out", counterpartyId: "cp_mortgage_061", merchantCategory: "other", description: "Mortgage repayment", recurring: true }),
  ...monthly(MONTHS.map((month) => ({ month, day: 15 })), { amount: 118, direction: "out", counterpartyId: "cp_utility_045", merchantCategory: "utilities", description: "Energy bill", recurring: true }),
  { date: "2026-07-14", amount: 420, direction: "out", counterpartyId: "cp_hospital_009", merchantCategory: "hospital", description: "Hospital invoice" },
  { date: "2026-07-16", amount: 38.4, direction: "out", counterpartyId: "cp_pharmacy_012", merchantCategory: "pharmacy", description: "Pharmacy" },
  { date: "2026-07-18", amount: 92, direction: "out", counterpartyId: "cp_babystore_077", merchantCategory: "baby", description: "Baby store" },
  { date: "2026-07-26", amount: 74.5, direction: "out", counterpartyId: "cp_babystore_077", merchantCategory: "baby", description: "Baby store" },
  { date: "2026-08-08", amount: 110, direction: "out", counterpartyId: "cp_babystore_077", merchantCategory: "baby", description: "Baby store" },
  { date: "2026-08-22", amount: 61.9, direction: "out", counterpartyId: "cp_babystore_078", merchantCategory: "baby", description: "Baby store" },
  { date: "2026-09-06", amount: 95, direction: "out", counterpartyId: "cp_babystore_077", merchantCategory: "baby", description: "Baby store" },
  { date: "2026-09-19", amount: 82.3, direction: "out", counterpartyId: "cp_babystore_078", merchantCategory: "baby", description: "Baby store" },
  ...monthly([{ month: "2026-08", day: 5 }, { month: "2026-09", day: 5 }], { amount: 480, direction: "out", counterpartyId: "cp_childcare_091", merchantCategory: "childcare", description: "Childcare", recurring: true }),
  ...monthly([{ month: "2026-08", day: 10 }, { month: "2026-09", day: 10 }], { amount: 173.2, direction: "in", counterpartyId: "cp_childbenefit_001", merchantCategory: "child_benefit", description: "Child benefit", recurring: true }),
];

// Thomas — frequent traveller (3+ travel per month, foreign card payments on credit card)
const thomasTravel = (date: string, amount: number, description: string, cp: string): TxSeed => ({
  date, amount, direction: "out", counterpartyId: cp, merchantCategory: "travel", description, accountId: "acc_003_cc",
});
const thomasAbroad = (date: string, amount: number, category: MerchantCategory, description: string, cp: string): TxSeed => ({
  date, amount, direction: "out", counterpartyId: cp, merchantCategory: category, description, foreign: true, accountId: "acc_003_cc",
});
const thomas: TxSeed[] = [
  ...everydayNoise(3, { salary: 4620, salaryCp: "cp_employer_031" }),
  ...monthly(MONTHS.map((month) => ({ month, day: 1 })), { amount: 1320, direction: "out", counterpartyId: "cp_rent_033", merchantCategory: "rent", description: "Monthly rent", recurring: true }),
  ...monthly(MONTHS.map((month) => ({ month, day: 15 })), { amount: 84, direction: "out", counterpartyId: "cp_utility_046", merchantCategory: "utilities", description: "Energy bill", recurring: true }),
  thomasTravel("2026-06-18", 240, "Airline ticket", "cp_airline_501"),
  // July (3)
  thomasTravel("2026-07-04", 189, "Airline ticket", "cp_airline_501"),
  thomasTravel("2026-07-11", 312, "Hotel booking", "cp_hotel_511"),
  thomasTravel("2026-07-22", 96, "International train", "cp_rail_521"),
  thomasAbroad("2026-07-12", 64.2, "restaurants", "Restaurant abroad", "cp_restaurant_611"),
  thomasAbroad("2026-07-13", 31.5, "transport", "Taxi abroad", "cp_transport_612"),
  // August (4)
  thomasTravel("2026-08-03", 215, "Airline ticket", "cp_airline_502"),
  thomasTravel("2026-08-09", 428, "Hotel booking", "cp_hotel_512"),
  thomasTravel("2026-08-17", 172, "Airline ticket", "cp_airline_501"),
  thomasTravel("2026-08-26", 138, "Car rental", "cp_carrental_531"),
  thomasAbroad("2026-08-10", 87.9, "restaurants", "Restaurant abroad", "cp_restaurant_613"),
  thomasAbroad("2026-08-18", 45.0, "groceries", "Shop abroad", "cp_grocery_614"),
  // September (3)
  thomasTravel("2026-09-02", 205, "Airline ticket", "cp_airline_503"),
  thomasTravel("2026-09-08", 356, "Hotel booking", "cp_hotel_511"),
  thomasTravel("2026-09-21", 112, "International train", "cp_rail_521"),
  thomasAbroad("2026-09-09", 58.3, "restaurants", "Restaurant abroad", "cp_restaurant_615"),
];

// Emma — no life event; near-misses: one furniture purchase, one flight, one foreign payment
const emma: TxSeed[] = [
  ...everydayNoise(4, { salary: 2480, salaryCp: "cp_employer_041" }),
  ...monthly(MONTHS.map((month) => ({ month, day: 1 })), { amount: 760, direction: "out", counterpartyId: "cp_rent_034", merchantCategory: "rent", description: "Monthly rent", recurring: true }),
  ...monthly(MONTHS.map((month) => ({ month, day: 15 })), { amount: 71, direction: "out", counterpartyId: "cp_utility_047", merchantCategory: "utilities", description: "Energy bill", recurring: true }),
  ...monthly(MONTHS.map((month) => ({ month, day: 9 })), { amount: 29.99, direction: "out", counterpartyId: "cp_gym_303", merchantCategory: "subscriptions", description: "Gym membership", recurring: true }),
  { date: "2026-08-14", amount: 649, direction: "out", counterpartyId: "cp_furniture_015", merchantCategory: "furniture", description: "Furniture store" },
  { date: "2026-09-02", amount: 164, direction: "out", counterpartyId: "cp_airline_502", merchantCategory: "travel", description: "Airline ticket" },
  { date: "2026-09-12", amount: 22.4, direction: "out", counterpartyId: "cp_restaurant_616", merchantCategory: "restaurants", description: "Restaurant abroad", foreign: true },
  { date: "2026-07-19", amount: 12.5, direction: "out", counterpartyId: "cp_pharmacy_013", merchantCategory: "pharmacy", description: "Pharmacy" },
];

function build(customerId: string, prefix: string, seeds: TxSeed[]): Transaction[] {
  return [...seeds]
    .sort((a, b) => a.date.localeCompare(b.date) || a.counterpartyId.localeCompare(b.counterpartyId))
    .map((s, i) => ({
      id: `tx_${prefix}_${String(i + 1).padStart(4, "0")}`,
      customerId,
      accountId: s.accountId ?? `acc_${prefix}_cur`,
      date: s.date,
      amount: s.amount,
      direction: s.direction,
      counterpartyId: s.counterpartyId,
      merchantCategory: s.merchantCategory,
      description: s.description,
      recurring: s.recurring ?? false,
      foreign: s.foreign ?? false,
    }));
}

export const transactions: Transaction[] = [
  ...build("customer_001", "001", benjamin),
  ...build("customer_002", "002", sarah),
  ...build("customer_003", "003", thomas),
  ...build("customer_004", "004", emma),
];

// ---------------------------------------------------------------------------
// App behaviour
// ---------------------------------------------------------------------------

export const appBehaviour: AppBehaviour[] = [
  { id: "beh_001_1", customerId: "customer_001", timestamp: "2026-07-24T19:12:00Z", type: "screen_view", value: "accounts" },
  { id: "beh_001_2", customerId: "customer_001", timestamp: "2026-08-03T20:41:00Z", type: "kate_question", value: "How do I change my address?" },
  { id: "beh_001_3", customerId: "customer_001", timestamp: "2026-09-02T08:05:00Z", type: "screen_view", value: "insurance" },

  { id: "beh_002_1", customerId: "customer_002", timestamp: "2026-08-12T21:30:00Z", type: "screen_view", value: "savings" },
  { id: "beh_002_2", customerId: "customer_002", timestamp: "2026-09-03T13:02:00Z", type: "search", value: "budget" },

  { id: "beh_003_1", customerId: "customer_003", timestamp: "2026-08-01T06:44:00Z", type: "screen_view", value: "credit_card" },
  { id: "beh_003_2", customerId: "customer_003", timestamp: "2026-09-01T07:10:00Z", type: "search", value: "card limit" },

  { id: "beh_004_1", customerId: "customer_004", timestamp: "2026-08-20T18:25:00Z", type: "search", value: "savings goal" },
  { id: "beh_004_2", customerId: "customer_004", timestamp: "2026-09-14T12:00:00Z", type: "screen_view", value: "transactions" },
];

// ---------------------------------------------------------------------------
// General (non life-event) notifications
// ---------------------------------------------------------------------------

export const generalNotifications: GeneralNotificationSeed[] = [
  { customerId: "customer_001", title: "Your statement is ready", message: "Your September statement is available in the app.", createdAt: "2026-09-29T07:00:00Z" },
  { customerId: "customer_002", title: "Your statement is ready", message: "Your September statement is available in the app.", createdAt: "2026-09-29T07:00:00Z" },
  { customerId: "customer_002", title: "Security tip", message: "KBC will never ask for your PIN or card codes by phone or email.", createdAt: "2026-09-18T09:00:00Z" },
  { customerId: "customer_003", title: "Your statement is ready", message: "Your credit card statement for September is available.", createdAt: "2026-09-29T07:00:00Z" },
  { customerId: "customer_004", title: "Your statement is ready", message: "Your September statement is available in the app.", createdAt: "2026-09-29T07:00:00Z" },
  { customerId: "customer_004", title: "Security tip", message: "KBC will never ask for your PIN or card codes by phone or email.", createdAt: "2026-09-18T09:00:00Z" },
];
