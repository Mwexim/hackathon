// Small helpers shared by all API routes: generic errors, auth guards and a
// same-origin check for state-changing requests (defence in depth on top of
// the sameSite=lax cookie).

import { NextResponse } from "next/server";
import { getSession } from "./session";

const MESSAGES: Record<number, string> = {
  400: "Invalid request",
  401: "Not authenticated",
  403: "Forbidden",
  404: "Not found",
  409: "Conflict",
  500: "Something went wrong",
};

export function jsonError(status: keyof typeof MESSAGES | number) {
  return NextResponse.json({ error: MESSAGES[status] ?? "Error" }, { status });
}

export function noStore<T>(body: T, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

/** Rejects cross-site state-changing requests. */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin fetches from older browsers / curl
  const host = req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Returns the session customer id, or a 401 response. */
export async function requireCustomer(): Promise<{ customerId: string } | { response: NextResponse }> {
  const s = await getSession();
  if (s?.role !== "customer") return { response: jsonError(401) };
  return { customerId: s.customerId };
}
