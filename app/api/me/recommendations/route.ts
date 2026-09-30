import { jsonError, noStore, requireCustomer } from "@/lib/auth/guards";
import { getCustomer, getEvents, getPolicies } from "@/lib/data/store";
import { recommendationsFor } from "@/lib/recommendations/catalogue";
import type { RecommendationGroup } from "@/lib/types";

/** Recommendations only for CONFIRMED life events, filtered by marketing consent. */
export async function GET() {
  const auth = await requireCustomer();
  if ("response" in auth) return auth.response;

  const customer = getCustomer(auth.customerId);
  if (!customer) return jsonError(404);
  const policies = getPolicies(auth.customerId);

  const groups: RecommendationGroup[] = getEvents(auth.customerId)
    .filter((e) => e.status === "confirmed")
    .map((e) => ({
      eventId: e.id,
      eventType: e.type,
      recommendations: recommendationsFor(e.type, customer.consent.marketing, { policies }),
    }));

  return noStore(groups);
}
