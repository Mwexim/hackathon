// Signed session cookie (HMAC-SHA256). The customer identity is ALWAYS taken
// from here on the server — never from the URL, query string or request body.

import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { customerExists } from "@/lib/data/store";

export const SESSION_COOKIE = "lm_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

export type Session =
  | { role: "customer"; customerId: string; exp: number }
  | { role: "employee"; exp: number };

const g = globalThis as unknown as { __devSessionSecret?: string };

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set (min. 32 characters) in production");
  }
  // Development only: random per-process secret (sessions reset on restart).
  g.__devSessionSecret ??= randomBytes(32).toString("hex");
  return g.__devSessionSecret;
}

const b64url = (buf: Buffer) => buf.toString("base64url");
const sign = (data: string) => b64url(createHmac("sha256", getSecret()).update(data).digest());

export function createSessionToken(
  s: { role: "customer"; customerId: string } | { role: "employee" },
): string {
  const payload = { ...s, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS };
  const data = b64url(Buffer.from(JSON.stringify(payload)));
  return `${data}.${sign(data)}`;
}

export function verifySessionToken(token: string | undefined): Session | null {
  if (!token || token.length > 2048) return null;
  const [data, sig, extra] = token.split(".");
  if (!data || !sig || extra !== undefined) return null;

  const expected = Buffer.from(sign(data));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const p = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    if (typeof p?.exp !== "number" || p.exp < Math.floor(Date.now() / 1000)) return null;
    if (p.role === "employee") return { role: "employee", exp: p.exp };
    if (p.role === "customer" && typeof p.customerId === "string" && customerExists(p.customerId)) {
      return { role: "customer", customerId: p.customerId, exp: p.exp };
    }
    return null;
  } catch {
    return null;
  }
}

/** Reads and verifies the session from the incoming request cookies. */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

/** The logged-in customer's id, or null (employees are not customers). */
export async function getSessionCustomerId(): Promise<string | null> {
  const s = await getSession();
  return s?.role === "customer" ? s.customerId : null;
}

export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
