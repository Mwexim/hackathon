// In-memory state initialised from mock data. Resets on server restart or via
// resetState(). Every accessor is scoped by customerId, which callers MUST take
// from the session (lib/auth/session.ts) — never from the request URL, query or body.

import { randomUUID } from "crypto";
import type {
  Account,
  AppBehaviour,
  ConsentUpdate,
  Customer,
  InsurancePolicy,
  LifeEvent,
  Notification,
  Recommendation,
  RecommendationGroup,
  Transaction,
} from "@/lib/types";
import * as mock from "./mockData";
import { detectLifeEvents } from "@/lib/detection/detector";
import { lifeEventMessage } from "@/lib/detection/messages";
import { tierFor } from "@/lib/detection/config";
import { recommendationsFor } from "@/lib/recommendations/catalogue";

type CompletedAction = {
  customerId: string;
  eventId: string;
  recommendationId: string;
  completedAt: string;
};

type State = {
  customers: Customer[];
  accounts: Account[];
  transactions: Transaction[];
  policies: InsurancePolicy[];
  behaviour: AppBehaviour[];
  events: LifeEvent[] | null; // null until detection has run
  notifications: Notification[];
  completedActions: CompletedAction[];
};

// Kept on globalThis so all route bundles (and dev hot reloads) share one state.
const g = globalThis as unknown as { __lifeMomentsState?: State };

function initialState(): State {
  return {
    customers: structuredClone(mock.customers),
    accounts: structuredClone(mock.accounts),
    transactions: structuredClone(mock.transactions),
    policies: structuredClone(mock.policies),
    behaviour: structuredClone(mock.appBehaviour),
    events: null,
    notifications: mock.generalNotifications.map((n) => ({
      id: randomUUID(),
      customerId: n.customerId,
      eventId: null,
      kind: "general" as const,
      title: n.title,
      message: n.message,
      status: "unread" as const,
      createdAt: n.createdAt,
    })),
    completedActions: [],
  };
}

function getState(): State {
  g.__lifeMomentsState ??= initialState();
  return g.__lifeMomentsState;
}

/** Runs detection once for every customer and creates the question notifications. */
function getStateWithEvents(): State & { events: LifeEvent[] } {
  const state = getState();
  if (state.events === null) {
    state.events = [];
    for (const customer of state.customers) {
      for (const event of detectLifeEvents(customer.id)) {
        state.events.push(event);
        const { title, message } = lifeEventMessage(event.type, tierFor(event.confidence));
        state.notifications.push({
          id: randomUUID(),
          customerId: customer.id,
          eventId: event.id,
          kind: "life_event",
          title,
          message,
          status: "unread",
          createdAt: event.detectedAt,
        });
      }
    }
  }
  return state as State & { events: LifeEvent[] };
}

/** Restores the initial mock state (demo reset). Detection reruns on next access. */
export function resetState(): void {
  g.__lifeMomentsState = initialState();
}

const clone = <T>(v: T): T => structuredClone(v);

// ---------------------------------------------------------------------------
// Read accessors (all scoped to one customer)
// ---------------------------------------------------------------------------

export function customerExists(customerId: string): boolean {
  return getState().customers.some((c) => c.id === customerId);
}

export function getCustomer(customerId: string): Customer | null {
  const c = getState().customers.find((x) => x.id === customerId);
  return c ? clone(c) : null;
}

export function getAccounts(customerId: string): Account[] {
  return clone(getState().accounts.filter((a) => a.customerId === customerId));
}

export function getTransactions(customerId: string, limit: number): Transaction[] {
  return clone(
    getState()
      .transactions.filter((t) => t.customerId === customerId)
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
      .slice(0, limit),
  );
}

export function getPolicies(customerId: string): InsurancePolicy[] {
  return clone(getState().policies.filter((p) => p.customerId === customerId));
}

export function getEvents(customerId: string): LifeEvent[] {
  return clone(
    getStateWithEvents()
      .events.filter((e) => e.customerId === customerId)
      .sort((a, b) => b.confidence - a.confidence),
  );
}

export function getNotifications(customerId: string): Notification[] {
  return clone(
    getStateWithEvents()
      .notifications.filter((n) => n.customerId === customerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}

export function listCustomers(): Customer[] {
  return clone(getState().customers);
}

/** Raw inputs for the detector (unfiltered — extractSignals applies sensitiveFilter). */
export function getDetectionData(customerId: string) {
  const state = getState();
  const customer = state.customers.find((c) => c.id === customerId);
  if (!customer) return null;
  return clone({
    customer,
    transactions: state.transactions.filter((t) => t.customerId === customerId),
    policies: state.policies.filter((p) => p.customerId === customerId),
    behaviour: state.behaviour.filter((b) => b.customerId === customerId),
  });
}

/**
 * Recommendations for the customer's CONFIRMED events, consent-filtered.
 * This is the single source of truth for which actions a customer may complete.
 */
export function getRecommendationGroups(customerId: string): RecommendationGroup[] {
  const state = getStateWithEvents();
  const customer = state.customers.find((c) => c.id === customerId);
  if (!customer) return [];
  const policies = state.policies.filter((p) => p.customerId === customerId);
  return state.events
    .filter((e) => e.customerId === customerId && e.status === "confirmed")
    .sort((a, b) => b.confidence - a.confidence)
    .map((e) => ({
      eventId: e.id,
      eventType: e.type,
      recommendations: recommendationsFor(e.type, customer.consent.marketing, { policies }),
      completedActionIds: state.completedActions
        .filter((a) => a.customerId === customerId && a.eventId === e.id)
        .map((a) => a.recommendationId),
    }));
}

// ---------------------------------------------------------------------------
// Mutations (ownership and state transitions are checked here, not only in routes)
// ---------------------------------------------------------------------------

export type MutationResult<T> = { ok: true; value: T } | { ok: false; reason: "not_found" | "invalid_state" };

/** detected -> confirmed | dismissed. Anything else is refused. */
export function setEventStatus(
  customerId: string,
  eventId: string,
  status: "confirmed" | "dismissed",
): MutationResult<LifeEvent> {
  const state = getStateWithEvents();
  const event = state.events.find((e) => e.id === eventId && e.customerId === customerId);
  if (!event) return { ok: false, reason: "not_found" };
  if (event.status !== "detected") return { ok: false, reason: "invalid_state" };

  event.status = status;
  for (const n of state.notifications) {
    if (n.customerId === customerId && n.eventId === eventId) n.status = status;
  }
  return { ok: true, value: clone(event) };
}

export function markNotificationRead(customerId: string, notificationId: string): Notification | null {
  const n = getStateWithEvents().notifications.find(
    (x) => x.id === notificationId && x.customerId === customerId,
  );
  if (!n) return null;
  if (n.status === "unread") n.status = "read";
  return clone(n);
}

/**
 * Completes an action (fake application flow). Only recommendations that are
 * currently offered to this customer for a CONFIRMED event qualify; each can be
 * completed once. Service actions really update the customer's contracts.
 */
export function completeAction(customerId: string, recommendationId: string): MutationResult<Recommendation> {
  const state = getStateWithEvents();
  const group = getRecommendationGroups(customerId).find((g) =>
    g.recommendations.some((r) => r.id === recommendationId),
  );
  if (!group) return { ok: false, reason: "not_found" };
  if (group.completedActionIds.includes(recommendationId)) return { ok: false, reason: "invalid_state" };

  const customer = state.customers.find((c) => c.id === customerId)!;
  const policies = state.policies.filter((p) => p.customerId === customerId);

  if (recommendationId === "rec_move_update_home_insurance") {
    const home = policies.find((p) => p.type === "home");
    if (home) home.insuredAddress = customer.address;
  }
  if (recommendationId === "rec_baby_add_to_family_insurance") {
    const family = policies.find((p) => p.type === "family_liability");
    if (family) family.coveredHouseholdMembers += 1;
  }

  state.completedActions.push({
    customerId,
    eventId: group.eventId,
    recommendationId,
    completedAt: new Date().toISOString(),
  });
  return { ok: true, value: clone(group.recommendations.find((r) => r.id === recommendationId)!) };
}

/** Updates the session customer's own consent settings. */
export function updateConsent(customerId: string, update: ConsentUpdate): Customer | null {
  const customer = getState().customers.find((c) => c.id === customerId);
  if (!customer) return null;
  if (update.marketing) customer.consent.marketing = update.marketing;
  if (update.proactivityLevel) customer.consent.proactivityLevel = update.proactivityLevel;
  return clone(customer);
}
