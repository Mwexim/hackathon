import { z } from "zod";
import { isSameOrigin, jsonError, noStore, requireCustomer } from "@/lib/auth/guards";
import { completeAction } from "@/lib/data/store";
import type { ActionResult } from "@/lib/types";

const Params = z.object({ recommendationId: z.string().regex(/^rec_[a-z_]{1,60}$/) });
const Body = z.object({}).strict();

/**
 * Completes a recommended action for the session customer. 404 unless the
 * recommendation is currently offered for one of THEIR confirmed events;
 * 409 if it was already completed.
 */
export async function POST(req: Request, ctx: { params: Promise<{ recommendationId: string }> }) {
  if (!isSameOrigin(req)) return jsonError(403);
  const auth = await requireCustomer();
  if ("response" in auth) return auth.response;

  const parsed = Params.safeParse(await ctx.params);
  if (!parsed.success) return jsonError(404);

  const raw = await req.text();
  let body: unknown = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return jsonError(400);
  }
  if (!Body.safeParse(body).success) return jsonError(400);

  const result = completeAction(auth.customerId, parsed.data.recommendationId);
  if (!result.ok) return jsonError(result.reason === "not_found" ? 404 : 409);
  return noStore<ActionResult>({ status: "done", recommendationId: result.value.id });
}
