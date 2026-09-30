import { z } from "zod";
import { isSameOrigin, jsonError, noStore, requireCustomer } from "@/lib/auth/guards";
import { setEventStatus } from "@/lib/data/store";

const Params = z.object({ eventId: z.uuid() });

/**
 * Shared confirm/dismiss handler. The customer comes from the session; an event
 * that does not belong to that customer is indistinguishable from a missing one (404).
 * Only "detected" events can change state (409 otherwise).
 */
export async function handleEventStatus(
  req: Request,
  params: Promise<{ eventId: string }>,
  status: "confirmed" | "dismissed",
) {
  if (!isSameOrigin(req)) return jsonError(403);
  const auth = await requireCustomer();
  if ("response" in auth) return auth.response;

  const parsed = Params.safeParse(await params);
  if (!parsed.success) return jsonError(404);

  const result = setEventStatus(auth.customerId, parsed.data.eventId, status);
  if (!result.ok) return jsonError(result.reason === "not_found" ? 404 : 409);
  return noStore(result.value);
}
