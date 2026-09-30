// In-memory state initialised from mock data. Resets on server restart.
// Every accessor is scoped by customerId, which callers MUST take from the
// session (lib/auth/session.ts) — never from the request URL, query or body.

import { randomUUID } from "crypto";
import type {
  Account,
  AppBehaviour,
  Customer,
  InsurancePolicy,
  LifeEvent,
  Notification,
  Transaction,
} from "@/lib/types";
import * as mock from "./mockData";
import { detectLifeEvents } from "@/lib/detection/detector";
import { lifeEventMessage } from "@/lib/detection/messages";
import { tierFor } from "@/lib/detection/config";

type State = {
  customers: Customer[];
  accounts: Account[];
  transactions: Transaction[];
  policies: InsurancePolicy[];
  behaviour: AppBehaviour[];
  events: LifeEvent[] | null; // null until detection has run
  notifications: Notification[];
};

// Kept on globalThis so all route bundles (and dev hot reloads) share one state.
const g = globalThis as unknown as { __lifeMomentsState?: State };

function getState(): State {
  if (!g.__lifeMomentsState) {
    g.__lifeMomentsState = {
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
    };
  }
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

const clone = <T>(v: T): T => structuredClone(v);
const byDateDesc = (a: { date: string }, b: { date: string }) =>
  b.date.localeCompare(a.date);

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
      .sort((a, b) => byDateDesc(a, b) || b.id.localeCompare(a.id))
      .slice(0, limit),
  );
}

export function getPolicies(customerId: string): InsurancePolicy[] {
  return clone(getState().policies.filter((p) => p.customerId === customerId));
}

export function getEvents(customerId: string): LifeEvent[] {
  return clone(getStateWithEvents().events.filter((e) => e.customerId === customerId));
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

/** Raw inputs for the detector (unfiltered — the detector applies sensitiveFilter). */
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

// ---------------------------------------------------------------------------
// Mutations (ownership is checked here, not only in the route)
// ---------------------------------------------------------------------------

export type EventUpdateResult =
  | { ok: true; event: LifeEvent }
  | { ok: false; reason: "not_found" | "invalid_state" };

export function setEventStatus(
  customerId: string,
  eventId: string,
  status: "confirmed" | "dismissed",
): EventUpdateResult {
  const state = getStateWithEvents();
  const event = state.events.find((e) => e.id === eventId && e.customerId === customerId);
  if (!event) return { ok: false, reason: "not_found" };
  if (event.status !== "detected") return { ok: false, reason: "invalid_state" };

  event.status = status;
  for (const n of state.notifications) {
    if (n.customerId === customerId && n.eventId === eventId) n.status = status;
  }
  return { ok: true, event: clone(event) };
}

export function markNotificationRead(customerId: string, notificationId: string): Notification | null {
  const n = getStateWithEvents().notifications.find(
    (x) => x.id === notificationId && x.customerId === customerId,
  );
  if (!n) return null;
  if (n.status === "unread") n.status = "read";
  return clone(n);
}
