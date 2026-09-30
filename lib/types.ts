// SHARED CONTRACT — change only after team agreement.

export type ConsentLevel = "none" | "basic" | "tailored";

export type Customer = {
  id: string;
  name: string;
  age: number;
  postcode: string;
  householdType: "single" | "couple" | "family";
  language: "nl" | "fr" | "en";
  customerSince: string;
  digitalActive: boolean;
  address: string;
  consent: {
    marketing: ConsentLevel;
    proactivityLevel: "low" | "medium" | "high";
    preferredChannel: "app" | "email";
    topicsMuted: string[];
  };
};

export type Account = {
  id: string;
  customerId: string;
  type: "current" | "savings" | "credit_card";
  name: string;
  balance: number;
  currency: "EUR";
};

export type MerchantCategory =
  | "salary"
  | "rent"
  | "utilities"
  | "groceries"
  | "furniture"
  | "moving"
  | "hospital"
  | "pharmacy"
  | "baby"
  | "childcare"
  | "child_benefit"
  | "travel"
  | "restaurants"
  | "subscriptions"
  | "transport"
  | "other";

export type Transaction = {
  id: string;
  customerId: string;
  accountId: string;
  date: string;
  amount: number; // positive number
  direction: "in" | "out";
  counterpartyId: string; // pseudonymised, e.g. "cp_furniture_014"
  merchantCategory: MerchantCategory;
  description: string;
  recurring: boolean;
  foreign: boolean;
};

export type InsurancePolicy = {
  id: string;
  customerId: string;
  type: "home" | "car" | "family_liability" | "travel" | "hospitalisation";
  insuredAddress?: string;
  coveredHouseholdMembers: number;
  premium: number;
  renewalDate: string;
  includesTravelCover?: boolean;
};

export type AppBehaviour = {
  id: string;
  customerId: string;
  timestamp: string;
  type: "screen_view" | "search" | "kate_question";
  value: string;
};

export type LifeEventType = "moved_house" | "new_baby" | "frequent_traveller";

export type Evidence = {
  signal: string;
  description: string; // plain language for customers
  likelihoodRatio: number;
};

export type LifeEvent = {
  id: string;
  customerId: string;
  type: LifeEventType;
  confidence: number; // always 0..1
  status: "detected" | "confirmed" | "dismissed";
  detectedAt: string;
  evidence: Evidence[];
};

export type Notification = {
  id: string;
  customerId: string;
  eventId: string | null;
  kind: "life_event" | "general";
  title: string;
  message: string;
  status: "unread" | "read" | "confirmed" | "dismissed";
  createdAt: string;
};

export type Recommendation = {
  id: string;
  eventType: LifeEventType;
  kind: "service" | "commercial"; // service = protects an existing contract
  title: string;
  description: string;
  icon: string;
  actionLabel: string;
};

// ---- Additions for API responses (baseline) ----

/** GET /api/me/recommendations returns one group per CONFIRMED life event. */
export type RecommendationGroup = {
  eventId: string;
  eventType: LifeEventType;
  recommendations: Recommendation[]; // service first, then commercial
  completedActionIds: string[]; // recommendation ids already completed via /api/me/actions
};

/** POST /api/me/actions/:recommendationId */
export type ActionResult = { status: "done"; recommendationId: string };

/** PATCH /api/me/consent */
export type ConsentUpdate = {
  marketing?: ConsentLevel;
  proactivityLevel?: Customer["consent"]["proactivityLevel"];
};

/** GET /api/employee/overview (employee only). */
export type EmployeeOverview = {
  totalCustomers: number;
  runtimeMs: number;
  threshold: number;
  perEvent: { type: LifeEventType; detected: number; planted: number; precision: number; recall: number }[];
  thresholdCurve: { threshold: number; precision: number; recall: number }[];
  confidenceHistogram: { bucket: string; count: number }[];
  consentMix: Record<ConsentLevel, number>;
  actionsByKind: { service: number; commercial: number };
};

/** GET /api/debug/events?customer=... (employee only, dev only): "Explain the math". */
export type MathSignal = {
  signal: string;
  group: string;
  likelihoodRatio: number;
  description: string;
  counted: boolean; // false when a stronger signal in the same group was used
};

export type MathExplanation = {
  customerId: string;
  customerName: string;
  events: {
    type: LifeEventType;
    prior: number;
    priorOdds: number;
    signals: MathSignal[];
    odds: number;
    confidence: number;
    tier: QuestionTier;
  }[];
};

/** Question tier derived from confidence (see lib/detection/config.ts). */
export type QuestionTier = "direct" | "soft" | "none";

/** GET /api/debug/events (employee only, never in production). */
export type DebugEventScore = {
  type: LifeEventType;
  confidence: number;
  tier: QuestionTier;
  evidence: Evidence[];
  status: LifeEvent["status"] | "below_threshold";
};

export type DebugCustomerReport = {
  customerId: string;
  customerName: string;
  consent: ConsentLevel;
  scores: DebugEventScore[];
};

/** GET /api/session — who is logged in (no sensitive data). */
export type SessionInfo =
  | { role: "customer"; customerId: string; name: string }
  | { role: "employee"; name: string };
