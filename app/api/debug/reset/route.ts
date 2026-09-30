import { isSameOrigin, jsonError, noStore } from "@/lib/auth/guards";
import { getSession } from "@/lib/auth/session";
import { resetState } from "@/lib/data/store";

/** Restores the initial demo state. Employee only; disabled in production. */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") return jsonError(404);
  if (!isSameOrigin(req)) return jsonError(403);
  const s = await getSession();
  if (!s) return jsonError(401);
  if (s.role !== "employee") return jsonError(403);

  resetState();
  return noStore({ ok: true });
}
