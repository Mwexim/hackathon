// The ONLY place the frontend talks to the API. Components never call fetch
// directly and never import mock data. The session cookie is httpOnly, so the
// browser sends it automatically; no customer id is ever passed from here.

import type {
  Account,
  ActionResult,
  ConsentUpdate,
  Customer,
  DebugCustomerReport,
  EmployeeOverview,
  InsurancePolicy,
  MathExplanation,
  LifeEvent,
  Notification,
  RecommendationGroup,
  SessionInfo,
  Transaction,
} from "@/lib/types";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, typeof body?.error === "string" ? body.error : "Request failed");
  }
  return res.json() as Promise<T>;
}

const seg = (id: string) => encodeURIComponent(id);

// --- session ---
export const login = (loginId: string) =>
  request<{ ok: true; role: "customer" | "employee" }>("/api/session", {
    method: "POST",
    body: JSON.stringify({ customerId: loginId }),
  });
export const logout = () => request<{ ok: true }>("/api/session", { method: "DELETE" });
export const getSession = () => request<SessionInfo>("/api/session");

// --- customer data (always the logged-in customer) ---
export const getCustomer = () => request<Customer>("/api/me/customer");
export const getAccounts = () => request<Account[]>("/api/me/accounts");
export const getTransactions = (limit = 20) =>
  request<Transaction[]>(`/api/me/transactions?limit=${Math.max(1, Math.min(200, Math.floor(limit)))}`);
export const getNotifications = () => request<Notification[]>("/api/me/notifications");
export const markNotificationRead = (notificationId: string) =>
  request<Notification>(`/api/notifications/${seg(notificationId)}/read`, { method: "POST" });

// --- life events ---
export const getEvents = () => request<LifeEvent[]>("/api/me/events");
export const confirmEvent = (eventId: string) =>
  request<LifeEvent>(`/api/events/${seg(eventId)}/confirm`, { method: "POST" });
export const dismissEvent = (eventId: string) =>
  request<LifeEvent>(`/api/events/${seg(eventId)}/dismiss`, { method: "POST" });

// --- recommendations (only for confirmed events, consent-filtered server-side) ---
export const getRecommendations = () => request<RecommendationGroup[]>("/api/me/recommendations");
export const completeAction = (recommendationId: string) =>
  request<ActionResult>(`/api/me/actions/${seg(recommendationId)}`, { method: "POST", body: "{}" });

// --- contracts & consent ---
export const getPolicies = () => request<InsurancePolicy[]>("/api/me/policies");
export const updateConsent = (update: ConsentUpdate) =>
  request<Customer>("/api/me/consent", { method: "PATCH", body: JSON.stringify(update) });

// --- employee ---
export const getEmployeeOverview = (threshold = 0.5) =>
  request<EmployeeOverview>(`/api/employee/overview?threshold=${encodeURIComponent(threshold.toFixed(2))}`);
export const getDebugEvents = () => request<DebugCustomerReport[]>("/api/debug/events");
export const explainMath = (demoCustomerId: string) =>
  request<MathExplanation>(`/api/debug/events?customer=${encodeURIComponent(demoCustomerId)}`);
export const resetDemo = () => request<{ ok: true }>("/api/debug/reset", { method: "POST" });
