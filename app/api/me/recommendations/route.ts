import { noStore, requireCustomer } from "@/lib/auth/guards";
import { getRecommendationGroups } from "@/lib/data/store";

/** Recommendations only for CONFIRMED life events, filtered by marketing consent. */
export async function GET() {
  const auth = await requireCustomer();
  if ("response" in auth) return auth.response;
  return noStore(getRecommendationGroups(auth.customerId));
}
