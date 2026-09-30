import { NextResponse } from "next/server";
import { z } from "zod";
import { DEMO_LOGINS, DEMO_LOGIN_IDS, EMPLOYEE_LOGIN_ID } from "@/lib/auth/demoUsers";
import { jsonError, isSameOrigin, noStore } from "@/lib/auth/guards";
import {
  clearSessionCookie,
  createSessionToken,
  getSession,
  setSessionCookie,
} from "@/lib/auth/session";
import { customerExists, getCustomer } from "@/lib/data/store";
import type { SessionInfo } from "@/lib/types";

const LoginBody = z.object({ customerId: z.enum(DEMO_LOGIN_IDS) }).strict();

/** Who is logged in. */
export async function GET() {
  const s = await getSession();
  if (!s) return jsonError(401);
  if (s.role === "employee") return noStore<SessionInfo>({ role: "employee", name: "KBC employee" });
  const c = getCustomer(s.customerId);
  if (!c) return jsonError(401);
  return noStore<SessionInfo>({ role: "customer", customerId: c.id, name: c.name });
}

/** Demo login: the ONLY endpoint that accepts a customer id from the client. */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return jsonError(403);
  const body = await req.json().catch(() => null);
  const parsed = LoginBody.safeParse(body);
  if (!parsed.success) return jsonError(400);

  const id = parsed.data.customerId;
  const login = DEMO_LOGINS.find((l) => l.id === id);
  if (!login) return jsonError(400);

  let token: string;
  if (login.role === "employee") {
    // The employee debug login only exists outside production.
    if (id !== EMPLOYEE_LOGIN_ID || process.env.NODE_ENV === "production") return jsonError(400);
    token = createSessionToken({ role: "employee" });
  } else {
    if (!customerExists(id)) return jsonError(400);
    token = createSessionToken({ role: "customer", customerId: id });
  }

  const res = NextResponse.json({ ok: true, role: login.role });
  setSessionCookie(res, token);
  return res;
}

/** Logout. */
export async function DELETE(req: Request) {
  if (!isSameOrigin(req)) return jsonError(403);
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
