import { z } from "zod";
import { isSameOrigin, jsonError, noStore, requireCustomer } from "@/lib/auth/guards";
import { markNotificationRead } from "@/lib/data/store";

const Params = z.object({ notificationId: z.uuid() });

/** Marks one of the session customer's notifications as read (404 if not theirs). */
export async function POST(req: Request, ctx: { params: Promise<{ notificationId: string }> }) {
  if (!isSameOrigin(req)) return jsonError(403);
  const auth = await requireCustomer();
  if ("response" in auth) return auth.response;

  const parsed = Params.safeParse(await ctx.params);
  if (!parsed.success) return jsonError(404);

  const n = markNotificationRead(auth.customerId, parsed.data.notificationId);
  return n ? noStore(n) : jsonError(404);
}
